import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deletePhoto,
  getGetEditableProfileQueryKey,
  reorderPhotos,
  updateProfile,
  uploadPhoto,
} from '@/api/generated/organization-editing/organization-editing';
import type { UpdateProfileRequest } from '@/api/generated/model';

/** Why an edit failed, in the terms the screen needs to tell the person what to do. */
export class EditError extends Error {
  readonly reason: 'invalid' | 'too-large' | 'limit' | 'forbidden' | 'unavailable';

  constructor(reason: EditError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

const REASONS: Record<number, EditError['reason']> = {
  400: 'invalid',
  403: 'forbidden',
  409: 'limit',
  413: 'too-large',
};

async function succeeds<T extends { status: number }>(call: Promise<T>): Promise<T> {
  let response;
  try {
    response = await call;
  } catch {
    throw new EditError('unavailable');
  }
  if (response.status >= 200 && response.status < 300) return response;
  throw new EditError(REASONS[response.status] ?? 'unavailable');
}

/** Every edit changes what the editing screen shows, so each one reloads it when it succeeds. */
function useEdit<Variables, Result>(
  organizationId: string,
  edit: (variables: Variables) => Promise<Result>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: edit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getGetEditableProfileQueryKey(organizationId) }),
  });
}

export function useSaveProfile(organizationId: string) {
  return useEdit(organizationId, (data: UpdateProfileRequest) =>
    succeeds(updateProfile(organizationId, data)),
  );
}

export function useUploadPhoto(organizationId: string) {
  return useEdit(organizationId, (file: File) => succeeds(uploadPhoto(organizationId, { file })));
}

export function useReorderPhotos(organizationId: string) {
  return useEdit(organizationId, (photoIds: string[]) =>
    succeeds(reorderPhotos(organizationId, { photoIds })),
  );
}

export function useDeletePhoto(organizationId: string) {
  return useEdit(organizationId, (photoId: string) =>
    succeeds(deletePhoto(organizationId, photoId)),
  );
}
