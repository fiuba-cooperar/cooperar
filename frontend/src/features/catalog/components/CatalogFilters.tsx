import {
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Title,
  type SelectProps,
} from '@mantine/core';
import { useState } from 'react';
import { Province, SaleMode, type ProductSearchResponse } from '@/api/generated/model';
import { useProductCategories } from '../api/useProductCategories';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { SALE_MODE_LABELS } from '../labels';
import { hasFilters, NO_FILTERS, type ProductSearch } from '../productSearch';
import styles from './CatalogFilters.module.css';

const ALL_PROVINCES = 'all';
const ALL_CATEGORIES = 'all';

// The full name of the City of Buenos Aires does not fit in the field, so the filter uses the short one.
const PROVINCE_OPTIONS = [
  { value: ALL_PROVINCES, label: 'Todas las provincias' },
  ...Object.entries(PROVINCE_LABELS).map(([value, label]) => ({
    value,
    label: value === Province.CITY_OF_BUENOS_AIRES ? 'Ciudad de Buenos Aires' : label,
  })),
];

/**
 * A select with a search. While it is open the field is empty, so the visitor types straight away instead of first
 * erasing the chosen option; closing it shows the chosen option again.
 */
function SearchableSelect(props: SelectProps) {
  const [search, setSearch] = useState('');
  return (
    <Select
      {...props}
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      onDropdownOpen={() => {
        setSearch('');
      }}
    />
  );
}

/**
 * The filters of the catalog beside the results. Each sale mode shows how many products it would leave with the other
 * filters as they are, so choosing the other one adds to the results.
 */
export function CatalogFilters({
  search,
  facets,
  onChange,
}: {
  search: ProductSearch;
  facets: ProductSearchResponse | undefined;
  onChange: (changes: Partial<ProductSearch>) => void;
}) {
  const { data: categories = [] } = useProductCategories();
  const counts = new Map(facets?.saleModes.map(({ saleMode, count }) => [saleMode, count]));
  return (
    <Paper
      component="aside"
      aria-labelledby="filters-title"
      withBorder
      radius={14}
      className={styles.panel}
    >
      <Stack gap={22}>
        <Group justify="space-between">
          <Title order={2} fz={18} id="filters-title">
            Filtros
          </Title>
          {hasFilters(search) && (
            <Button
              variant="subtle"
              size="compact-md"
              onClick={() => {
                onChange(NO_FILTERS);
              }}
            >
              Limpiar
            </Button>
          )}
        </Group>
        <SearchableSelect
          label="Categoría"
          data={[
            { value: ALL_CATEGORIES, label: 'Todas las categorías' },
            ...categories.map(({ id, name }) => ({ value: id, label: name })),
          ]}
          value={search.categoryId ?? ALL_CATEGORIES}
          allowDeselect={false}
          nothingFoundMessage="No hay categorías con ese nombre"
          classNames={{ label: styles.legend }}
          onChange={(value) => {
            onChange({ categoryId: value === null || value === ALL_CATEGORIES ? null : value });
          }}
        />
        <Checkbox.Group
          label="Modalidad de venta"
          value={search.saleModes}
          classNames={{ label: styles.legend }}
          onChange={(values) => {
            onChange({ saleModes: values });
          }}
        >
          <Stack gap={4} mt={6}>
            {Object.values(SaleMode).map((mode) => (
              <Checkbox
                key={mode}
                value={mode}
                size="md"
                classNames={{ body: styles.option, labelWrapper: styles.optionLabel }}
                label={
                  <>
                    {SALE_MODE_LABELS[mode]}{' '}
                    <span className={styles.count}>{counts.get(mode) ?? 0}</span>
                  </>
                }
              />
            ))}
          </Stack>
        </Checkbox.Group>
        <SearchableSelect
          label="Provincia"
          data={PROVINCE_OPTIONS}
          value={search.province ?? ALL_PROVINCES}
          allowDeselect={false}
          nothingFoundMessage="No hay provincias con ese nombre"
          classNames={{ label: styles.legend }}
          onChange={(value) => {
            onChange({
              province:
                value === null || value === ALL_PROVINCES
                  ? null
                  : (value as ProductSearch['province']),
            });
          }}
        />
        <Text size="sm" c="dimmed" lh={1.5}>
          Los precios son orientativos y los define cada cooperativa. El precio final se acuerda al
          pedir el presupuesto.
        </Text>
      </Stack>
    </Paper>
  );
}
