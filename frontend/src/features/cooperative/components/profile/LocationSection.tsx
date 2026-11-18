import { Alert, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconMapPinOff } from '@tabler/icons-react';
import { lazy, Suspense, useState } from 'react';
import {
  Province,
  Visibility,
  type CooperativeOrganizationProfileResponse,
  type GeoPointRequest,
} from '@/api/generated/model';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { SectionForm } from './SectionForm';
import { hasErrors, type Errors, type SectionProps } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);

const PROVINCES = Object.values(Province);
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

interface Form {
  province: Province | null;
  district: string;
  locality: string;
  street: string;
  additionalReferences: string;
  streetVisibility: Visibility;
}

type AddressField = Exclude<keyof Form, 'streetVisibility'>;

function fromProfile({ location }: CooperativeOrganizationProfileResponse): Form {
  return {
    province: location.address.province,
    district: location.address.district,
    locality: location.address.locality,
    street: location.address.street,
    additionalReferences: location.address.additionalReferences ?? '',
    streetVisibility: location.streetVisibility,
  };
}

function validate(form: Form): Errors<Form> {
  return {
    province: form.province ? undefined : 'Elegí una provincia.',
    district: form.district.trim() ? undefined : 'Ingresá el departamento, partido o comuna.',
    locality: form.locality.trim() ? undefined : 'Ingresá la localidad o el barrio.',
    street: form.street.trim() ? undefined : 'Ingresá la calle y el número.',
  };
}

export function LocationSection({ profile, hidden, saving, next, save }: SectionProps) {
  const [form, setForm] = useState(() => fromProfile(profile));
  const [errors, setErrors] = useState<Errors<Form>>({});
  const [point, setPoint] = useState(profile.location.point);
  // Only a pin the person moved is sent; otherwise the backend locates a changed address again.
  const [moved, setMoved] = useState(false);
  const [addressChanged, setAddressChanged] = useState(false);

  function updateAddress(field: AddressField, value: string | null) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setAddressChanged(true);
    // The pin was placed for the old address.
    setMoved(false);
  }

  async function onSave() {
    const validation = validate(form);
    setErrors(validation);
    const { province } = form;
    if (hasErrors(validation) || !province) return false;
    const references = form.additionalReferences.trim();
    const pin: GeoPointRequest | undefined = moved && point ? point : undefined;
    const saved = await save({
      section: 'location',
      data: {
        address: {
          province,
          district: form.district.trim(),
          locality: form.locality.trim(),
          street: form.street.trim(),
          ...(references && { additionalReferences: references }),
        },
        streetVisibility: form.streetVisibility,
        ...(pin && { point: pin }),
      },
    });
    setForm(fromProfile(saved));
    setPoint(saved.location.point);
    setMoved(false);
    setAddressChanged(false);
    return true;
  }

  const streetPublic = form.streetVisibility === Visibility.PUBLIC;
  return (
    <SectionForm
      id="location"
      title="Ubicación"
      hidden={hidden}
      saving={saving}
      next={next}
      onSave={onSave}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-province"
              label="Provincia"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <Select
              id="profile-province"
              searchable
              nothingFoundMessage="No encontramos esa provincia"
              autoComplete="address-level1"
              data={PROVINCE_OPTIONS}
              value={form.province}
              error={errors.province}
              onChange={(value) => {
                updateAddress('province', PROVINCES.find((province) => province === value) ?? null);
              }}
            />
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-district"
              label="Departamento/Partido/Comuna"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <TextInput
              id="profile-district"
              maxLength={100}
              value={form.district}
              error={errors.district}
              onChange={(event) => {
                updateAddress('district', event.currentTarget.value);
              }}
            />
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-locality"
              label="Localidad/Barrio"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <TextInput
              id="profile-locality"
              autoComplete="address-level2"
              maxLength={100}
              value={form.locality}
              error={errors.locality}
              onChange={(event) => {
                updateAddress('locality', event.currentTarget.value);
              }}
            />
          </div>
        </SimpleGrid>
        <div>
          <FieldHeader
            htmlFor="profile-street"
            label="Calle y número"
            visibility={
              <VisibilityToggle
                field="la calle y el número"
                value={form.streetVisibility}
                onChange={(visibility) => {
                  setForm((current) => ({ ...current, streetVisibility: visibility }));
                }}
              />
            }
          />
          <TextInput
            id="profile-street"
            autoComplete="address-line1"
            maxLength={200}
            value={form.street}
            error={errors.street}
            onChange={(event) => {
              updateAddress('street', event.currentTarget.value);
            }}
          />
          <Text size="sm" c="dimmed" mt={6} aria-live="polite">
            {streetPublic
              ? 'Se muestra en tu ficha y el mapa marca el punto exacto.'
              : 'No se muestra. El mapa público marca solo la zona de tu localidad.'}
          </Text>
        </div>
        <div>
          <FieldHeader
            htmlFor="profile-references"
            label="Referencias para llegar (opcional)"
            hint="Se muestran solo junto con la calle y el número."
            visibility={<VisibilityBadge visibility={form.streetVisibility} />}
          />
          <TextInput
            id="profile-references"
            placeholder="Ej.: portón verde, al lado de la escuela"
            autoComplete="address-line2"
            maxLength={300}
            aria-description="Se muestran solo junto con la calle y el número."
            value={form.additionalReferences}
            onChange={(event) => {
              updateAddress('additionalReferences', event.currentTarget.value);
            }}
          />
        </div>
        <div>
          <FieldHeader
            label="Punto en el mapa"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          {point ? (
            <Stack gap={6}>
              <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                <LocationMap
                  latitude={point.latitude}
                  longitude={point.longitude}
                  label="Mapa con el punto de tu entidad. Podés arrastrar el pin para corregirlo."
                  onMove={(dropped) => {
                    setPoint(dropped);
                    setMoved(true);
                  }}
                />
              </Suspense>
              <Text size="sm" c="dimmed" aria-live="polite">
                {addressChanged && !moved
                  ? 'Al guardar, ubicamos la nueva dirección en el mapa.'
                  : 'Lo ubicamos a partir de la dirección. Si no quedó bien, arrastrá el pin.'}
              </Text>
            </Stack>
          ) : (
            <Alert color="yellow" icon={<IconMapPinOff aria-hidden />}>
              {addressChanged
                ? 'Al guardar, ubicamos la dirección en el mapa.'
                : 'No pudimos ubicar la dirección en el mapa. Revisá que la calle, la localidad y el partido estén bien escritos y guardá de nuevo.'}
            </Alert>
          )}
        </div>
      </Stack>
    </SectionForm>
  );
}
