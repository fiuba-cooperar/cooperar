import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addProductPhoto,
  createProduct,
  deleteProduct,
  unpublishProduct,
  getGetManagedProductQueryKey,
  getListManagedProductsQueryKey,
  getManagedProduct,
  listManagedProducts,
  publishProduct,
  removeProductPhoto,
  reorderProductPhotos,
  updateProduct,
} from '@/api/generated/cooperative-products/cooperative-products';
import type { ProductRequest, ProductResponse } from '@/api/generated/model';
import { getListOrganizationProductsQueryKey } from '@/api/generated/products/products';

async function fetchProducts(organizationId: string): Promise<ProductResponse[]> {
  const response = await listManagedProducts(organizationId);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** Every product of the organization, the unpublished ones included. */
export function useProducts(organizationId: string) {
  return useQuery({
    queryKey: getListManagedProductsQueryKey(organizationId),
    queryFn: () => fetchProducts(organizationId),
  });
}

async function fetchProduct(organizationId: string, productId: string) {
  const response = await getManagedProduct(organizationId, productId);
  const httpStatus: number = response.status;
  if (httpStatus === 404) return null;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** One product; null when it does not exist or belongs to another organization. */
export function useProduct(organizationId: string, productId: string | undefined) {
  return useQuery({
    queryKey: getGetManagedProductQueryKey(organizationId, productId ?? ''),
    queryFn: () => fetchProduct(organizationId, productId ?? ''),
    enabled: productId !== undefined,
  });
}

/** Why saving a product failed: the server rejected the data, or no usable answer. */
export class ProductSaveError extends Error {
  readonly reason: 'invalid' | 'unavailable';

  constructor(reason: ProductSaveError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function save(organizationId: string, productId: string | undefined, data: ProductRequest) {
  let response: Awaited<ReturnType<typeof createProduct | typeof updateProduct>>;
  try {
    response =
      productId === undefined
        ? await createProduct(organizationId, data)
        : await updateProduct(organizationId, productId, data);
  } catch {
    throw new ProductSaveError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 200 || httpStatus === 201) return response.data;
  throw new ProductSaveError(httpStatus === 400 ? 'invalid' : 'unavailable');
}

/** What changes the lists: the panel's one, and the public one while the product is shown there. */
function useRefreshProducts(organization: { id: string; slug: string }) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListManagedProductsQueryKey(organization.id) }),
      queryClient.invalidateQueries({
        queryKey: getListOrganizationProductsQueryKey(organization.slug),
      }),
    ]);
  };
}

/** Creates the product, or edits it when `productId` is given; rejects with a {@link ProductSaveError}. */
export function useSaveProduct(
  organization: { id: string; slug: string },
  productId: string | undefined,
) {
  const queryClient = useQueryClient();
  const refresh = useRefreshProducts(organization);
  return useMutation({
    mutationFn: (data: ProductRequest) => save(organization.id, productId, data),
    onSuccess: async (product) => {
      queryClient.setQueryData(getGetManagedProductQueryKey(organization.id, product.id), product);
      await refresh();
    },
  });
}

/** Takes the product off the public profile; it stays in the organization's list. */
export function useUnpublishProduct(organization: { id: string; slug: string }) {
  const refresh = useRefreshProducts(organization);
  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await unpublishProduct(organization.id, productId);
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    onSuccess: refresh,
  });
}

/** Uploads one photo; true when the product took it. */
async function uploadPhoto(organizationId: string, productId: string, file: File) {
  try {
    const response = await addProductPhoto(organizationId, productId, { file });
    const httpStatus: number = response.status;
    return httpStatus === 200;
  } catch {
    return false;
  }
}

/** Adds and removes the photos of a product, keeping the lists and the product in the cache up to date. */
export function useProductPhotos(organization: { id: string; slug: string }) {
  const queryClient = useQueryClient();
  const refresh = useRefreshProducts(organization);

  /** Uploads the files one after the other, so they keep the order they were chosen in; answers how many failed. */
  async function upload(productId: string, files: File[]) {
    let failed = 0;
    for (const file of files) {
      if (!(await uploadPhoto(organization.id, productId, file))) failed += 1;
    }
    await queryClient.invalidateQueries({
      queryKey: getGetManagedProductQueryKey(organization.id, productId),
    });
    await refresh();
    return failed;
  }

  const remove = useMutation({
    mutationFn: async ({ productId, photoId }: { productId: string; photoId: string }) => {
      const response = await removeProductPhoto(organization.id, productId, photoId);
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    onSuccess: async (product) => {
      queryClient.setQueryData(getGetManagedProductQueryKey(organization.id, product.id), product);
      await refresh();
    },
  });

  const reorder = useMutation({
    mutationFn: async ({ productId, photoIds }: { productId: string; photoIds: string[] }) => {
      const response = await reorderProductPhotos(organization.id, productId, { photoIds });
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    // Optimistic: the photos take their new place at once, and go back if the server refuses.
    onMutate: async ({ productId, photoIds }) => {
      const key = getGetManagedProductQueryKey(organization.id, productId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProductResponse | null>(key);
      if (previous) {
        const byId = new Map(previous.photos.map((photo) => [photo.id, photo]));
        const photos = photoIds.flatMap((id) => byId.get(id) ?? []);
        queryClient.setQueryData(key, { ...previous, photos });
      }
      return { key, previous };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: async (_data, _error, { productId }) => {
      await queryClient.invalidateQueries({
        queryKey: getGetManagedProductQueryKey(organization.id, productId),
      });
      await refresh();
    },
  });

  return { upload, remove, reorder };
}

/** Shows the product on the public profile. */
export function usePublishProduct(organization: { id: string; slug: string }) {
  const refresh = useRefreshProducts(organization);
  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await publishProduct(organization.id, productId);
      const httpStatus: number = response.status;
      if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return response.data;
    },
    onSuccess: refresh,
  });
}

/** Deletes a product, published or not, and its photos for good. */
export function useDeleteProduct(organization: { id: string; slug: string }) {
  const queryClient = useQueryClient();
  const refresh = useRefreshProducts(organization);
  return useMutation({
    mutationFn: async (productId: string) => {
      const response = await deleteProduct(organization.id, productId);
      const httpStatus: number = response.status;
      if (httpStatus !== 204) throw new Error(`Unexpected status ${String(httpStatus)}`);
      return productId;
    },
    onSuccess: async (productId) => {
      queryClient.removeQueries({
        queryKey: getGetManagedProductQueryKey(organization.id, productId),
      });
      await refresh();
    },
  });
}
