import { keepPreviousData } from '@tanstack/react-query';
import {
  useListDistricts,
  useListLocalities,
  useListStreets,
} from '@/api/generated/geography/geography';
import { Province } from '@/api/generated/model';

/** Fewest characters of a street the backend looks up. */
export const STREET_MIN_QUERY = 3;

// Suggestions are best effort: anything but a list means there is nothing to suggest, and the field is typed by hand.
function listOrNothing<T>(response: { status: number; data: unknown }): T[] {
  const httpStatus: number = response.status;
  return httpStatus === 200 && Array.isArray(response.data) ? (response.data as T[]) : [];
}

// Only a placeholder for the disabled query: nothing is asked for until there is a province.
const NO_PROVINCE = Province.BUENOS_AIRES;

/** The district names of a province, to suggest in the address form. */
export function useDistrictNames(province: Province | null) {
  return useListDistricts(
    { province: province ?? NO_PROVINCE },
    {
      query: {
        enabled: province !== null,
        // The backend keeps them for days: once per visit is enough.
        staleTime: Infinity,
        select: (response) => listOrNothing<{ name: string }>(response).map(({ name }) => name),
      },
    },
  );
}

/** The localities of a province, with their district, to suggest in the address form. */
export function useLocalities(province: Province | null) {
  return useListLocalities(
    { province: province ?? NO_PROVINCE },
    {
      query: {
        enabled: province !== null,
        staleTime: Infinity,
        select: (response) => listOrNothing<{ name: string; district: string }>(response),
      },
    },
  );
}

/** The streets that match what the person typed, once it is long enough. */
export function useStreetNames(province: Province | null, district: string, text: string) {
  const q = text.trim();
  return useListStreets(
    { province: province ?? NO_PROVINCE, q, ...(district.trim() && { district: district.trim() }) },
    {
      query: {
        enabled: province !== null && q.length >= STREET_MIN_QUERY,
        staleTime: Infinity,
        // The previous suggestions stay while the next ones arrive, so the list does not blink.
        placeholderData: keepPreviousData,
        select: (response) => listOrNothing<{ name: string }>(response).map(({ name }) => name),
      },
    },
  );
}
