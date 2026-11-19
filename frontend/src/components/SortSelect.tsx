import { Select } from '@mantine/core';
import styles from './SortSelect.module.css';

interface SortOption<T extends string> {
  value: T;
  label: string;
}

/** The "Ordenar por" field of the public listings, so all of them look the same. */
export function SortSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SortOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Select
      label="Ordenar por"
      data={options}
      value={value}
      allowDeselect={false}
      // The same height as the map button beside it, instead of the 48px of the other fields.
      styles={{ input: { height: 44, minHeight: 44 } }}
      classNames={{ root: styles.root, label: styles.label, wrapper: styles.field }}
      onChange={(selected) => {
        const option = options.find((candidate) => candidate.value === selected);
        if (option) onChange(option.value);
      }}
    />
  );
}
