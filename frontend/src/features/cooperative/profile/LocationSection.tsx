import { Button, Select, SimpleGrid, Text, TextInput } from '@mantine/core';
import { lazy, Suspense, useState } from 'react';
import { Province } from '@/api/generated/model';
import type { PickedPoint } from '@/components/map/LocationPicker';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { useSaveLocation } from '../api/useManagedProfile';
import { ProfileField } from './ProfileField';
import { SectionForm } from './SectionForm';
import type { SectionProps } from './IdentificationSection';

const LocationPicker = lazy(() =>
  import('@/components/map/LocationPicker').then((module) => ({ default: module.LocationPicker })),
);

const PROVINCES = Object.values(Province);
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

export function LocationSection({ profile, nextLabel, onNext }: SectionProps) {
  const save = useSaveLocation(profile.id);
  const { address } = profile;
  const [province, setProvince] = useState<Province | null>(address.province);
  const [district, setDistrict] = useState(address.district);
  const [locality, setLocality] = useState(address.locality);
  const [street, setStreet] = useState(address.street);
  const [streetPublic, setStreetPublic] = useState(profile.streetPublic);
  const [references, setReferences] = useState(address.additionalReferences ?? '');
  const [point, setPoint] = useState<PickedPoint | null>(profile.location ?? null);
  const [problem, setProblem] = useState<Record<string, string>>({});

  function submit() {
    const problems: Record<string, string> = {};
    if (!province) problems.province = 'Elegí una provincia.';
    if (!district.trim()) problems.district = 'Ingresá el departamento, partido o comuna.';
    if (!locality.trim()) problems.locality = 'Ingresá la localidad o el barrio.';
    if (!street.trim()) problems.street = 'Ingresá la calle y el número.';
    setProblem(problems);
    if (!province || Object.keys(problems).length > 0) return;
    save.mutate({
      address: {
        province,
        district,
        locality,
        street,
        ...(references.trim() && { additionalReferences: references }),
      },
      streetPublic,
      ...(point && { location: point }),
    });
  }

  return (
    <SectionForm
      id="section-location"
      title="Ubicación"
      saving={save.isPending}
      saved={save.isSuccess}
      error={save.error}
      onSubmit={submit}
      nextLabel={nextLabel}
      {...(onNext && { onNext })}
    >
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <ProfileField
          htmlFor="profile-province"
          label="Provincia"
          fixed="public"
          error={problem.province}
        >
          <Select
            id="profile-province"
            searchable
            nothingFoundMessage="No encontramos esa provincia"
            data={PROVINCE_OPTIONS}
            value={province}
            onChange={(value) => {
              setProvince(PROVINCES.find((item) => item === value) ?? null);
            }}
          />
        </ProfileField>
        <ProfileField
          htmlFor="profile-district"
          label="Partido, departamento o comuna"
          fixed="public"
          error={problem.district}
        >
          <TextInput
            id="profile-district"
            maxLength={100}
            value={district}
            onChange={(event) => {
              setDistrict(event.currentTarget.value);
            }}
          />
        </ProfileField>
        <ProfileField
          htmlFor="profile-locality"
          label="Localidad o barrio"
          fixed="public"
          error={problem.locality}
        >
          <TextInput
            id="profile-locality"
            maxLength={100}
            value={locality}
            onChange={(event) => {
              setLocality(event.currentTarget.value);
            }}
          />
        </ProfileField>
      </SimpleGrid>
      <ProfileField
        htmlFor="profile-street"
        label="Calle y número"
        visibility={{ isPublic: streetPublic, onChange: setStreetPublic }}
        error={problem.street}
      >
        <TextInput
          id="profile-street"
          maxLength={200}
          value={street}
          onChange={(event) => {
            setStreet(event.currentTarget.value);
          }}
        />
        <Text size="sm" c="dimmed">
          {streetPublic
            ? 'Se muestra en tu ficha y el mapa marca el punto exacto.'
            : 'No se muestra. El mapa público marca solo la zona de tu localidad.'}
        </Text>
      </ProfileField>
      <ProfileField
        htmlFor="profile-references"
        label="Referencias para llegar (opcional)"
        fixed="public"
      >
        <TextInput
          id="profile-references"
          maxLength={300}
          placeholder="Ej.: portón verde, al lado de la escuela"
          value={references}
          onChange={(event) => {
            setReferences(event.currentTarget.value);
          }}
        />
      </ProfileField>
      <ProfileField htmlFor="profile-map" label="Punto en el mapa" fixed="public">
        <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
          <LocationPicker value={point} onChange={setPoint} label="Mapa para ubicar la entidad" />
        </Suspense>
        <Text size="sm" c="dimmed" id="profile-map-hint">
          Hacé clic en el mapa para ubicar el punto, y arrastrá el pin para ajustarlo.
        </Text>
        {point && (
          <Button
            type="button"
            variant="subtle"
            size="compact-sm"
            w="fit-content"
            onClick={() => {
              setPoint(null);
            }}
          >
            Quitar el punto
          </Button>
        )}
      </ProfileField>
    </SectionForm>
  );
}
