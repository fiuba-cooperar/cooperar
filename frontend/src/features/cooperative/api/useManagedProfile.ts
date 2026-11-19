import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGetManagedProfileQueryKey,
  getManagedProfile,
  updateProfileActivity,
  updateProfileContact,
  updateProfileIdentification,
  updateProfileLocation,
} from '@/api/generated/cooperative-profile/cooperative-profile';
import type {
  CooperativeProfileResponse,
  ProfileActivityRequest,
  ProfileContactRequest,
  ProfileIdentificationRequest,
  ProfileLocationRequest,
} from '@/api/generated/model';

/** Why saving a section failed: the server rejected the data, or no usable answer. */
export class ProfileSaveError extends Error {
  readonly reason: 'invalid' | 'unavailable';

  constructor(reason: ProfileSaveError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

async function fetchProfile(organizationId: string): Promise<CooperativeProfileResponse> {
  const response = await getManagedProfile(organizationId);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** The whole profile of an organization the account manages, with the visibility of each field. */
export function useManagedProfile(organizationId: string) {
  return useQuery({
    queryKey: getGetManagedProfileQueryKey(organizationId),
    queryFn: () => fetchProfile(organizationId),
  });
}

type Saver<T> = (organizationId: string, data: T) => Promise<{ status: number; data: unknown }>;

function useSectionSaver<T>(organizationId: string, save: Saver<T>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: T): Promise<CooperativeProfileResponse> => {
      let response: Awaited<ReturnType<Saver<T>>>;
      try {
        response = await save(organizationId, data);
      } catch {
        throw new ProfileSaveError('unavailable');
      }
      if (response.status === 200) return response.data as CooperativeProfileResponse;
      throw new ProfileSaveError(response.status === 400 ? 'invalid' : 'unavailable');
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(getGetManagedProfileQueryKey(organizationId), profile);
    },
  });
}

export function useSaveIdentification(organizationId: string) {
  return useSectionSaver<ProfileIdentificationRequest>(organizationId, updateProfileIdentification);
}

export function useSaveActivity(organizationId: string) {
  return useSectionSaver<ProfileActivityRequest>(organizationId, updateProfileActivity);
}

export function useSaveLocation(organizationId: string) {
  return useSectionSaver<ProfileLocationRequest>(organizationId, updateProfileLocation);
}

export function useSaveContact(organizationId: string) {
  return useSectionSaver<ProfileContactRequest>(organizationId, updateProfileContact);
}
