import { Alert, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { IconMapPinOff } from '@tabler/icons-react';
import { lazy, Suspense } from 'react';
import { Province, Visibility } from '@/api/generated/model';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { ADDRESS_NAME_MAX, type AddressDraft, type AddressForm } from './addressDraft';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);

const PROVINCES = Object.values(Province);
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

type AddressField = Exclude<keyof AddressForm, 'streetVisibility'>;

interface Props {
  /** Prefix of the ids of the fields, unique on the page. */
  idPrefix: string;
  draft: AddressDraft;
  onChange: (draft: AddressDraft) => void;
  /** What the map is the point of, for screen readers: «tu entidad», «esta dirección». */
  mapSubject: string;
  /** An example for the name, fitting the kind of address. */
  namePlaceholder: string;
}

/**
 * The fields of one address, its street visibility and its point on the map, with a draggable pin. The main address
 * and each of the other ones use it.
 */
export function AddressFields({ idPrefix, draft, onChange, mapSubject, namePlaceholder }: Props) {
  const { form, errors, point } = draft;
  const id = (field: string) => `${idPrefix}-${field}`;

  function updateAddress(field: AddressField, value: string | null) {
    onChange({
      ...draft,
      form: { ...form, [field]: value },
      errors: { ...errors, [field]: undefined },
      changed: true,
      // The pin was placed for the old address.
      moved: false,
    });
  }

  const streetPublic = form.streetVisibility === Visibility.PUBLIC;
  return (
    <Stack gap="md">
      <div>
        <FieldHeader
          htmlFor={id('address-name')}
          label="Nombre de la dirección (opcional)"
          hint="Para reconocerla fácil, en tu ficha y en la pública."
          visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
        />
        <TextInput
          id={id('address-name')}
          placeholder={namePlaceholder}
          maxLength={ADDRESS_NAME_MAX}
          aria-description="Para reconocerla fácil, en tu ficha y en la pública."
          w={{ base: '100%', sm: '50%' }}
          value={form.name}
          onChange={(event) => {
            // The name does not move the point: only the address does.
            onChange({ ...draft, form: { ...form, name: event.currentTarget.value } });
          }}
        />
      </div>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <div>
          <FieldHeader
            htmlFor={id('province')}
            label="Provincia"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <Select
            id={id('province')}
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
            htmlFor={id('district')}
            label="Departamento/Partido/Comuna"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <TextInput
            id={id('district')}
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
            htmlFor={id('locality')}
            label="Localidad/Barrio"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <TextInput
            id={id('locality')}
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
          htmlFor={id('street')}
          label="Calle y número"
          visibility={
            <VisibilityToggle
              field="la calle y el número"
              value={form.streetVisibility}
              onChange={(visibility) => {
                onChange({ ...draft, form: { ...form, streetVisibility: visibility } });
              }}
            />
          }
        />
        <TextInput
          id={id('street')}
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
            : 'No se muestra. El mapa público marca solo la zona de la localidad.'}
        </Text>
      </div>
      <div>
        <FieldHeader
          htmlFor={id('references')}
          label="Referencias para llegar (opcional)"
          hint="Se muestran solo junto con la calle y el número."
          visibility={<VisibilityBadge visibility={form.streetVisibility} />}
        />
        <TextInput
          id={id('references')}
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
                label={`Mapa con el punto de ${mapSubject}. Podés arrastrar el pin para corregirlo.`}
                onMove={(dropped) => {
                  onChange({ ...draft, point: dropped, moved: true });
                }}
              />
            </Suspense>
            <Text size="sm" c="dimmed" aria-live="polite">
              {draft.changed && !draft.moved
                ? 'Al guardar, ubicamos la nueva dirección en el mapa.'
                : 'Lo ubicamos a partir de la dirección. Si no quedó bien, arrastrá el pin.'}
            </Text>
          </Stack>
        ) : (
          <Alert color="yellow" icon={<IconMapPinOff aria-hidden />}>
            {draft.changed
              ? 'Al guardar, ubicamos la dirección en el mapa.'
              : 'No pudimos ubicar la dirección en el mapa. Revisá que la calle, la localidad y el partido estén bien escritos y guardá de nuevo.'}
          </Alert>
        )}
      </div>
    </Stack>
  );
}
