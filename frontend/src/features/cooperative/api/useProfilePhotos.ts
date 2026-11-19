import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addProfilePhoto,
  getGetManagedOrganizationProfileQueryKey,
  removeProfileCover,
  removeProfileLogo,
  removeProfilePhoto,
  reorderProfilePhotos,
  replaceProfileCover,
  replaceProfileLogo,
} from '@/api/generated/cooperative-organization-profile/cooperative-organization-profile';
import type { CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import {
  getGetOrganizationProfileQueryKey,
  getSearchOrganizationsQueryKey,
} from '@/api/generated/organizations/organizations';

/** The logo and the cover are one image each: a new one replaces the one there was. */
export type SinglePhoto = 'logo' | 'cover';

/** The profile the server answers with, or an error for any other answer. */
async function profileFrom(
  request: Promise<{ status: number; data: CooperativeOrganizationProfileResponse }>,
) {
  const response = await request;
  // The client types only the success, but the server may answer 400, 404, 409 or 502 too.
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

function replace(id: string, photo: SinglePhoto, file: File) {
  return profileFrom(
    photo === 'logo' ? replaceProfileLogo(id, { file }) : replaceProfileCover(id, { file }),
  );
}

function remove(id: string, photo: SinglePhoto) {
  return profileFrom(photo === 'logo' ? removeProfileLogo(id) : removeProfileCover(id));
}

/**
 * The photos of the profile: the logo, the cover and the gallery. Each change answers with the whole profile, which
 * replaces the cached one; the public profile and the directory, which show the photos, are reloaded.
 */
export function useProfilePhotos(id: string) {
  const queryClient = useQueryClient();
  const key = getGetManagedOrganizationProfileQueryKey(id);

  async function saved(profile: CooperativeOrganizationProfileResponse) {
    queryClient.setQueryData(key, profile);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetOrganizationProfileQueryKey(profile.slug) }),
      queryClient.invalidateQueries({ queryKey: getSearchOrganizationsQueryKey() }),
    ]);
  }

  const replaceSingle = useMutation({
    mutationFn: ({ photo, file }: { photo: SinglePhoto; file: File }) => replace(id, photo, file),
    onSuccess: saved,
  });

  const removeSingle = useMutation({
    mutationFn: (photo: SinglePhoto) => remove(id, photo),
    onSuccess: saved,
  });

  /** Uploads the files one after the other, so they keep the order they were chosen in; answers how many failed. */
  async function upload(files: File[]) {
    let failed = 0;
    for (const file of files) {
      try {
        await saved(await profileFrom(addProfilePhoto(id, { file })));
      } catch {
        failed += 1;
      }
    }
    return failed;
  }

  const removePhoto = useMutation({
    mutationFn: (photoId: string) => profileFrom(removeProfilePhoto(id, photoId)),
    onSuccess: saved,
  });

  const reorder = useMutation({
    mutationFn: (photoIds: string[]) => profileFrom(reorderProfilePhotos(id, { photoIds })),
    // Optimistic: the photos take their new place at once, and go back if the server refuses.
    onMutate: async (photoIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CooperativeOrganizationProfileResponse>(key);
      if (previous) {
        const byId = new Map(previous.photos.gallery.map((photo) => [photo.id, photo]));
        const gallery = photoIds.flatMap((photoId) => byId.get(photoId) ?? []);
        queryClient.setQueryData(key, { ...previous, photos: { ...previous.photos, gallery } });
      }
      return { previous };
    },
    onError: (_error, _photoIds, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: saved,
  });

  return { replaceSingle, removeSingle, upload, removePhoto, reorder };
}
