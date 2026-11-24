import {
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Title,
  type SelectProps,
} from '@mantine/core';
import { useRef, useState } from 'react';
import {
  ProductType,
  Province,
  Role,
  SaleMode,
  type ProductSearchResponse,
} from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { useProductCategories } from '../api/useProductCategories';
import { accentInsensitiveFilter } from '@/features/geography/placeNames';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { SALE_MODE_LABELS, TYPE_LABELS } from '../labels';
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
 * erasing the chosen option; closing it shows the chosen option again. Choosing an option leaves the field, so
 * the caret, which is only for typing a search, does not stay blinking.
 */
function SearchableSelect(props: SelectProps) {
  const [search, setSearch] = useState('');
  const input = useRef<HTMLInputElement>(null);
  // The new value reaches the props a moment later (it goes through the address), and until then the field would show
  // the previous option, so it keeps the chosen one meanwhile.
  const [chosen, setChosen] = useState(props.value ?? null);
  const [seen, setSeen] = useState(props.value ?? null);
  if (seen !== (props.value ?? null)) {
    setSeen(props.value ?? null);
    setChosen(props.value ?? null);
  }
  return (
    <Select
      {...props}
      value={chosen}
      ref={input}
      onChange={(value, option) => {
        setChosen(value);
        props.onChange?.(value, option);
        input.current?.blur();
      }}
      searchable
      filter={accentInsensitiveFilter}
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
  const { user } = useAuth();
  // Only a cooperative account has entities of its own to look at.
  const own = user?.role === Role.COOPERATIVE ? user.organizations : [];
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
        <Checkbox.Group
          label="Tipo"
          value={search.types}
          classNames={{ label: styles.legend }}
          onChange={(values) => {
            onChange({ types: values });
          }}
        >
          <Stack gap={4} mt={6}>
            {Object.values(ProductType).map((type) => (
              <Checkbox
                key={type}
                value={type}
                size="md"
                classNames={{ body: styles.option, labelWrapper: styles.optionLabel }}
                label={TYPE_LABELS[type]}
              />
            ))}
          </Stack>
        </Checkbox.Group>
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
        {own.length > 0 && (
          <Checkbox.Group
            label="Mis entidades"
            value={search.organizationSlugs}
            classNames={{ label: styles.legend }}
            onChange={(slugs) => {
              const mine = new Set(own.map(({ slug }) => slug));
              // Slugs that come from the address and are not the account's stay as they are.
              onChange({
                organizationSlugs: [
                  ...search.organizationSlugs.filter((slug) => !mine.has(slug)),
                  ...slugs.filter((slug) => mine.has(slug)),
                ],
              });
            }}
          >
            <Stack gap={4} mt={6}>
              {own.map(({ slug, name }) => (
                <Checkbox
                  key={slug}
                  value={slug}
                  size="md"
                  label={name}
                  classNames={{ body: styles.option, labelWrapper: styles.optionLabel }}
                />
              ))}
            </Stack>
          </Checkbox.Group>
        )}
      </Stack>
    </Paper>
  );
}
