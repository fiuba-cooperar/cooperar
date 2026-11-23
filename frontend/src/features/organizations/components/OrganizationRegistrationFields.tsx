import {
  Checkbox,
  Fieldset,
  Group,
  MultiSelect,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { ActivityType, Province, Sector } from '@/api/generated/model';
import {
  DistrictInput,
  LocalityInput,
  StreetInput,
} from '@/features/geography/components/PlaceFields';
import { ACTIVITY_TYPE_LABELS, PROVINCE_LABELS, SECTOR_LABELS } from '../labels';
import type { FormErrors, OrganizationForm } from '../registrationForm';
import { OrganizationTypePicker } from './OrganizationTypePicker';

const SECTORS = Object.values(Sector);
const ACTIVITY_TYPES = Object.values(ActivityType);
const PROVINCES = Object.values(Province);
const SECTOR_OPTIONS = SECTORS.map((value) => ({ value, label: SECTOR_LABELS[value] }));
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

/** The organization fields of a registration: on sign-up and when correcting it at the observatory's request. */
export function OrganizationRegistrationFields({
  value,
  errors,
  onChange,
}: {
  value: OrganizationForm;
  errors: FormErrors<OrganizationForm>;
  onChange: <K extends keyof OrganizationForm>(field: K, value: OrganizationForm[K]) => void;
}) {
  return (
    <>
      <Stack gap="md">
        <OrganizationTypePicker
          value={value.type}
          error={errors.type}
          onChange={(type) => {
            onChange('type', type);
          }}
        />
        <TextInput
          label="Nombre de la entidad"
          maxLength={200}
          value={value.name}
          error={errors.name}
          onChange={(event) => {
            onChange('name', event.currentTarget.value);
          }}
        />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <TextInput
            label="Razón social"
            placeholder="Cooperativa de Trabajo … Ltda."
            maxLength={200}
            value={value.legalName}
            error={errors.legalName}
            onChange={(event) => {
              onChange('legalName', event.currentTarget.value);
            }}
          />
          <TextInput
            label="CUIT"
            inputMode="numeric"
            placeholder="30-12345678-1"
            maxLength={15}
            value={value.cuit}
            error={errors.cuit}
            onChange={(event) => {
              onChange('cuit', event.currentTarget.value);
            }}
          />
        </SimpleGrid>
        <Checkbox.Group
          label="Tipo de actividad"
          description="Podés elegir más de uno."
          value={value.activityTypes}
          error={errors.activityTypes}
          onChange={(values) => {
            onChange(
              'activityTypes',
              ACTIVITY_TYPES.filter((type) => values.includes(type)),
            );
          }}
        >
          <Group gap="lg" mt="xs">
            {ACTIVITY_TYPES.map((type) => (
              <Checkbox key={type} value={type} label={ACTIVITY_TYPE_LABELS[type]} />
            ))}
          </Group>
        </Checkbox.Group>
        <MultiSelect
          label="Rubros"
          description="Podés elegir más de uno."
          placeholder={value.sectors.length === 0 ? 'Elegí los rubros' : undefined}
          data={SECTOR_OPTIONS}
          value={value.sectors}
          error={errors.sectors}
          onChange={(values) => {
            onChange(
              'sectors',
              SECTORS.filter((sector) => values.includes(sector)),
            );
          }}
        />
      </Stack>
      <Fieldset
        variant="unstyled"
        // No inset or browser margin, so the address fields line up with the ones above.
        p={0}
        m={0}
        styles={{ legend: { padding: 0 } }}
        legend={
          <Title order={2} fz={18} mb="sm">
            Dirección principal
          </Title>
        }
      >
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Select
              label="Provincia"
              placeholder="Elegí una provincia"
              searchable
              nothingFoundMessage="No encontramos esa provincia"
              autoComplete="address-level1"
              data={PROVINCE_OPTIONS}
              value={value.province}
              error={errors.province}
              onChange={(value) => {
                onChange('province', PROVINCES.find((province) => province === value) ?? null);
              }}
            />
            <DistrictInput
              label="Departamento/Partido/Comuna"
              province={value.province}
              maxLength={100}
              value={value.district}
              error={errors.district}
              onChange={(district) => {
                onChange('district', district);
              }}
            />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <LocalityInput
              label="Localidad/Barrio"
              province={value.province}
              district={value.district}
              maxLength={100}
              value={value.locality}
              error={errors.locality}
              onChange={(locality) => {
                onChange('locality', locality);
              }}
              onDistrictFound={(district) => {
                onChange('district', district);
              }}
            />
            <StreetInput
              label="Calle y número"
              placeholder="Av. Rivadavia 1234"
              province={value.province}
              district={value.district}
              maxLength={200}
              value={value.street}
              error={errors.street}
              onChange={(street) => {
                onChange('street', street);
              }}
            />
          </SimpleGrid>
          <TextInput
            label="Referencias adicionales (opcional)"
            placeholder="Piso, local, entre calles…"
            autoComplete="address-line2"
            maxLength={300}
            value={value.additionalReferences}
            error={errors.additionalReferences}
            onChange={(event) => {
              onChange('additionalReferences', event.currentTarget.value);
            }}
          />
        </Stack>
      </Fieldset>
    </>
  );
}
