import { Button, Checkbox, Group, Paper, Select, Stack, Title } from '@mantine/core';
import { Province, type OrganizationSearchResponse } from '@/api/generated/model';
import {
  ACTIVITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '../labels';
import { hasFilters, type OrganizationSearch } from '../organizationSearch';
import styles from './SearchFilters.module.css';

const ALL_PROVINCES = 'all';

// The full name of the City of Buenos Aires does not fit in the field, so the filter uses the short one, as the mock.
const PROVINCE_OPTIONS = [
  { value: ALL_PROVINCES, label: 'Todas las provincias' },
  ...Object.entries(PROVINCE_LABELS).map(([value, label]) => ({
    value,
    label: value === Province.CITY_OF_BUENOS_AIRES ? 'Ciudad de Buenos Aires' : label,
  })),
];

interface Option<T> {
  value: T;
  count: number;
}

function FilterGroup<T extends string>({
  legend,
  options,
  labels,
  selected,
  onChange,
}: {
  legend: string;
  options: Option<T>[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (values: T[]) => void;
}) {
  return (
    <Checkbox.Group
      label={legend}
      value={selected}
      onChange={(values) => {
        onChange(values);
      }}
      classNames={{ label: styles.legend }}
    >
      <Stack gap={4} mt={6}>
        {options.map(({ value, count }) => (
          <Checkbox
            key={value}
            value={value}
            size="md"
            classNames={{ body: styles.option, labelWrapper: styles.optionLabel }}
            label={
              <>
                {labels[value]} <span className={styles.count}>{count}</span>
              </>
            }
          />
        ))}
      </Stack>
    </Checkbox.Group>
  );
}

/**
 * The filters of the directory. Each value shows how many organizations it would leave with the other filters as they
 * are, so choosing another one of the same filter adds to the results.
 */
export function SearchFilters({
  search,
  facets,
  onChange,
}: {
  search: OrganizationSearch;
  facets: OrganizationSearchResponse | undefined;
  onChange: (changes: Partial<OrganizationSearch>) => void;
}) {
  const types = facets?.types.map(({ type, count }) => ({ value: type, count })) ?? [];
  const sectors = facets?.sectors.map(({ sector, count }) => ({ value: sector, count })) ?? [];
  const activityTypes =
    facets?.activityTypes.map(({ activityType, count }) => ({ value: activityType, count })) ?? [];

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
                onChange({ query: '', types: [], sectors: [], activityTypes: [], province: null });
              }}
            >
              Limpiar
            </Button>
          )}
        </Group>
        <FilterGroup
          legend="Tipo de organización"
          options={types}
          labels={ORGANIZATION_TYPE_LABELS}
          selected={search.types}
          onChange={(values) => {
            onChange({ types: values });
          }}
        />
        <FilterGroup
          legend="Rubro"
          options={sectors}
          labels={SECTOR_LABELS}
          selected={search.sectors}
          onChange={(values) => {
            onChange({ sectors: values });
          }}
        />
        <FilterGroup
          legend="Qué ofrecen"
          options={activityTypes}
          labels={ACTIVITY_TYPE_LABELS}
          selected={search.activityTypes}
          onChange={(values) => {
            onChange({ activityTypes: values });
          }}
        />
        <Select
          label="Provincia"
          data={PROVINCE_OPTIONS}
          value={search.province ?? ALL_PROVINCES}
          allowDeselect={false}
          searchable
          nothingFoundMessage="No hay provincias con ese nombre"
          classNames={{ label: styles.legend }}
          onChange={(value) => {
            onChange({
              province:
                value === null || value === ALL_PROVINCES
                  ? null
                  : (value as OrganizationSearch['province']),
            });
          }}
        />
      </Stack>
    </Paper>
  );
}
