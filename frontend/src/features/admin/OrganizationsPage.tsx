import { Alert, Group, Select, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useSearchParams } from 'react-router';
import type { ListOrganizationsParams } from '@/api/generated/model';
import { useOrganizations } from './api/useOrganizations';
import { OrganizationCard } from './components/OrganizationCard';
import { ACTIVITY_TYPE_FILTERS, SECTOR_FILTERS, filterFromSlug } from './organizationFilters';
import { BOTH_TYPES_FILTER, REGISTRATION_TYPE_FILTERS } from './registrationStatus';
import styles from './RegistrationsPage.module.css';

const TYPE_PARAM = 'type';
const ACTIVITY_TYPE_PARAM = 'activityType';
const SECTOR_PARAM = 'sector';

function OrganizationList({ filters }: { filters: ListOrganizationsParams }) {
  const organizations = useOrganizations(filters);

  if (organizations.isPending) return <Text role="status">Cargando las entidades…</Text>;
  if (organizations.isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
        No pudimos cargar las entidades. Intentá de nuevo en unos minutos.
      </Alert>
    );
  }
  const { data } = organizations;
  return (
    <Stack gap="md">
      <Text role="status" size="sm" c="dimmed">
        {data.length === 0
          ? 'No hay entidades con estos filtros.'
          : `${String(data.length)} ${data.length === 1 ? 'entidad' : 'entidades'}`}
      </Text>
      {data.length > 0 && (
        <Stack component="ul" gap="md" className={styles.list}>
          {data.map((organization) => (
            <li key={organization.id}>
              <OrganizationCard organization={organization} />
            </li>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

/** The approved organizations, filtered by type, activity type and sector, with the filters kept in the address. */
export function OrganizationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter =
    REGISTRATION_TYPE_FILTERS.find(({ slug }) => slug === searchParams.get(TYPE_PARAM)) ??
    BOTH_TYPES_FILTER;
  const activityTypeFilter = filterFromSlug(
    ACTIVITY_TYPE_FILTERS,
    searchParams.get(ACTIVITY_TYPE_PARAM),
  );
  const sectorFilter = filterFromSlug(SECTOR_FILTERS, searchParams.get(SECTOR_PARAM));

  function setFilter(param: string, slug: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (slug) next.set(param, slug);
      return next;
    });
  }

  return (
    <Stack gap="lg">
      <Stack gap={6}>
        <Title order={1}>Entidades</Title>
        <Text c="dimmed">
          Las cooperativas y empresas recuperadas aprobadas por el observatorio.
        </Text>
      </Stack>
      <Group gap="md" align="flex-end">
        <Select
          label="Tipo de entidad"
          data={REGISTRATION_TYPE_FILTERS.map(({ slug, label }) => ({ value: slug, label }))}
          value={typeFilter.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(TYPE_PARAM, slug);
          }}
        />
        <Select
          label="Tipo de actividad"
          data={ACTIVITY_TYPE_FILTERS.map(({ slug, label }) => ({ value: slug, label }))}
          value={activityTypeFilter.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(ACTIVITY_TYPE_PARAM, slug);
          }}
        />
        <Select
          label="Rubro"
          data={SECTOR_FILTERS.map(({ slug, label }) => ({ value: slug, label }))}
          value={sectorFilter.slug}
          allowDeselect={false}
          w={{ base: '100%', xs: 240 }}
          onChange={(slug) => {
            setFilter(SECTOR_PARAM, slug);
          }}
        />
      </Group>
      <OrganizationList
        filters={{
          ...(typeFilter.type && { type: typeFilter.type }),
          ...(activityTypeFilter.value && { activityType: activityTypeFilter.value }),
          ...(sectorFilter.value && { sector: sectorFilter.value }),
        }}
      />
    </Stack>
  );
}
