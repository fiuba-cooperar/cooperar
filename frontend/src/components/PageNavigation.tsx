import { Group, Pagination } from '@mantine/core';

/**
 * The pages of a list, the same everywhere: arrows to the first and the last page besides the previous and the next,
 * each named for screen readers. `label` names the navigation, like «Páginas de consultas».
 */
export function PageNavigation({
  label,
  total,
  value,
  onChange,
  size,
}: {
  label: string;
  total: number;
  /** From 1. */
  value: number;
  onChange: (page: number) => void;
  size?: 'md' | 'lg';
}) {
  return (
    <Group component="nav" aria-label={label} justify="center">
      <Pagination
        total={total}
        value={value}
        size={size ?? 'md'}
        withEdges
        getItemProps={(page) => ({ 'aria-label': `Página ${String(page)}` })}
        getControlProps={(control) =>
          ({
            first: { 'aria-label': 'Primera página' },
            previous: { 'aria-label': 'Página anterior' },
            next: { 'aria-label': 'Página siguiente' },
            last: { 'aria-label': 'Última página' },
          })[control]
        }
        onChange={onChange}
      />
    </Group>
  );
}
