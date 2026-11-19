import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProductCategory,
  deleteProductCategory,
  getListAdminProductCategoriesQueryKey,
  listAdminProductCategories,
  renameProductCategory,
} from '@/api/generated/admin-product-categories/admin-product-categories';
import type { AdminProductCategoryResponse } from '@/api/generated/model';
import { getListProductCategoriesQueryKey } from '@/api/generated/products/products';

async function fetchCategories(): Promise<AdminProductCategoryResponse[]> {
  const response = await listAdminProductCategories();
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** The product categories with how many products each has. */
export function useAdminProductCategories() {
  return useQuery({
    queryKey: getListAdminProductCategoriesQueryKey(),
    queryFn: fetchCategories,
  });
}

/** Why changing a category failed: the name is taken or the category has products, or no usable answer. */
export class ProductCategoryError extends Error {
  readonly reason: 'conflict' | 'invalid' | 'unavailable';

  constructor(reason: ProductCategoryError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

function failure(httpStatus: number) {
  if (httpStatus === 409) return new ProductCategoryError('conflict');
  return new ProductCategoryError(httpStatus === 400 ? 'invalid' : 'unavailable');
}

/** Both lists change: the observatory's and the one the products form reads. */
function useRefreshCategories() {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getListAdminProductCategoriesQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getListProductCategoriesQueryKey() }),
    ]);
  };
}

/** Adds a category; rejects with a {@link ProductCategoryError}. */
export function useCreateCategory() {
  const refresh = useRefreshCategories();
  return useMutation({
    mutationFn: async (name: string) => {
      let status: number;
      try {
        status = (await createProductCategory({ name })).status;
      } catch {
        throw new ProductCategoryError('unavailable');
      }
      if (status !== 201) throw failure(status);
    },
    onSuccess: refresh,
  });
}

/** Renames a category; its products keep it. Rejects with a {@link ProductCategoryError}. */
export function useRenameCategory() {
  const refresh = useRefreshCategories();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      let status: number;
      try {
        status = (await renameProductCategory(id, { name })).status;
      } catch {
        throw new ProductCategoryError('unavailable');
      }
      if (status !== 200) throw failure(status);
    },
    onSuccess: refresh,
  });
}

/** Deletes a category without products; rejects with a {@link ProductCategoryError}. */
export function useDeleteCategory() {
  const refresh = useRefreshCategories();
  return useMutation({
    mutationFn: async (id: string) => {
      let status: number;
      try {
        status = (await deleteProductCategory(id)).status;
      } catch {
        throw new ProductCategoryError('unavailable');
      }
      if (status !== 204) throw failure(status);
    },
    onSuccess: refresh,
  });
}
