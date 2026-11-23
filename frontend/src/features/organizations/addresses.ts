import { AddressType } from '@/api/generated/model';

/**
 * The main address of an organization, which the API always sends; undefined only if a response came without it.
 * Works with both the public view and the one of the accounts that manage it.
 */
export function mainAddress<T extends { type: AddressType }>(
  addresses: readonly T[],
): T | undefined {
  return addresses.find((address) => address.type === AddressType.MAIN);
}

/** The addresses besides the main one, in the order the organization chose. */
export function otherAddresses<T extends { type: AddressType }>(addresses: readonly T[]): T[] {
  return addresses.filter((address) => address.type !== AddressType.MAIN);
}
