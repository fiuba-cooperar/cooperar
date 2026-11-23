import type { ComboboxParsedItem, OptionsFilter } from '@mantine/core';

/** A name as people compare it: without case, accents or extra spaces. */
export function placeKey(name: string) {
  return name.normalize('NFD').replace(/\p{M}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Shows the options that contain what the person typed, ignoring accents («cordoba» finds «Córdoba»). */
export const accentInsensitiveFilter: OptionsFilter = ({ options, search }) => {
  const wanted = placeKey(search);
  return options.filter(
    (option: ComboboxParsedItem) => 'label' in option && placeKey(option.label).includes(wanted),
  );
};

/** The street part of «Av. Rivadavia 1234»: what is looked up, since the provider knows streets, not numbers. */
export function streetName(text: string) {
  return text.replace(/\s*\d.*$/, '').trim();
}
