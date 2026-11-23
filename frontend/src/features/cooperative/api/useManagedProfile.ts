import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  geocodeProfileAddress,
  getGetManagedOrganizationProfileQueryKey,
  getManagedOrganizationProfile,
  updateProfileActivity,
  updateProfileContact,
  updateProfileIdentification,
  updateProfileLocation,
} from '@/api/generated/cooperative-organization-profile/cooperative-organization-profile';
import type {
  CooperativeOrganizationProfileResponse,
  GeoPointResponse,
  ProfileActivityRequest,
  ProfileContactRequest,
  ProfileIdentificationRequest,
  ProfileLocationRequest,
  RegistrationAddressRequest,
} from '@/api/generated/model';
import { getGetOrganizationProfileQueryKey } from '@/api/generated/organizations/organizations';
import { useAuth } from '@/features/auth/useAuth';

async function fetchProfile(id: string): Promise<CooperativeOrganizationProfileResponse> {
  const response = await getManagedOrganizationProfile(id);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data;
}

/** The whole profile of an organization the account manages, private fields and visibilities included. */
export function useManagedProfile(id: string) {
  return useQuery({
    queryKey: getGetManagedOrganizationProfileQueryKey(id),
    queryFn: () => fetchProfile(id),
  });
}

/** Why saving a section failed: the server rejected the data, or no usable answer. */
export class ProfileSaveError extends Error {
  readonly reason: 'invalid' | 'unavailable';

  constructor(reason: ProfileSaveError['reason']) {
    super(reason);
    this.reason = reason;
  }
}

export type ProfileSection =
  | { section: 'identification'; data: ProfileIdentificationRequest }
  | { section: 'activity'; data: ProfileActivityRequest }
  | { section: 'location'; data: ProfileLocationRequest }
  | { section: 'contact'; data: ProfileContactRequest };

function call(id: string, change: ProfileSection) {
  switch (change.section) {
    case 'identification':
      return updateProfileIdentification(id, change.data);
    case 'activity':
      return updateProfileActivity(id, change.data);
    case 'location':
      return updateProfileLocation(id, change.data);
    case 'contact':
      return updateProfileContact(id, change.data);
  }
}

async function save(id: string, change: ProfileSection) {
  let response: Awaited<ReturnType<typeof call>>;
  try {
    response = await call(id, change);
  } catch {
    throw new ProfileSaveError('unavailable');
  }
  const httpStatus: number = response.status;
  if (httpStatus === 200) return response.data;
  throw new ProfileSaveError(httpStatus === 400 ? 'invalid' : 'unavailable');
}

/**
 * Saves one section of the profile; rejects with a {@link ProfileSaveError}. The public profile is reloaded, and so is
 * the account when the name changes, so the panel header shows the new one.
 */
export function useSaveProfileSection(id: string) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (change: ProfileSection) => save(id, change),
    onSuccess: async (profile, change) => {
      queryClient.setQueryData(getGetManagedOrganizationProfileQueryKey(id), profile);
      await queryClient.invalidateQueries({
        queryKey: getGetOrganizationProfileQueryKey(profile.slug),
      });
      if (change.section === 'identification') await refreshUser();
    },
  });
}

async function geocode(id: string, address: RegistrationAddressRequest) {
  const response = await geocodeProfileAddress(id, address);
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  return response.data.point ?? null;
}

/** Where an address goes on the map, without saving it: null when it cannot be found. */
export function useGeocodeAddress(id: string) {
  return useMutation({
    mutationFn: (address: RegistrationAddressRequest): Promise<GeoPointResponse | null> =>
      geocode(id, address),
  });
}
