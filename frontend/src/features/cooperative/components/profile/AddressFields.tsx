import {
  Alert,
  Button,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsMaximize, IconMapPinOff, IconMapSearch } from '@tabler/icons-react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Province, Visibility, type RegistrationAddressRequest } from '@/api/generated/model';
import {
  DistrictInput,
  LocalityInput,
  StreetInput,
} from '@/features/geography/components/PlaceFields';
import { PROVINCE_LABELS } from '@/features/organizations/labels';
import { useGeocodeAddress } from '../../api/useManagedProfile';
import {
  ADDRESS_NAME_MAX,
  addressRequest,
  validateAddress,
  type AddressDraft,
  type AddressForm,
} from './addressDraft';
import { hasErrors } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);

const PROVINCES = Object.values(Province);
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

type AddressField = Exclude<keyof AddressForm, 'streetVisibility'>;

/** How the last «Ubicar en el mapa» went, when it did not place the pin. */
type LocateProblem = 'notFound' | 'failed';

function sameAddress(a: RegistrationAddressRequest | null, b: RegistrationAddressRequest | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface Props {
  /** The organization whose profile has the address; locating it needs it. */
  organizationId: string;
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
export function AddressFields({
  organizationId,
  idPrefix,
  draft,
  onChange,
  mapSubject,
  namePlaceholder,
}: Props) {
  const { form, errors, point } = draft;
  const id = (field: string) => `${idPrefix}-${field}`;
  const [mapExpanded, setMapExpanded] = useState(false);
  // On a phone the dialog takes the whole screen, so the map gets all the room there is.
  const smallScreen = useMediaQuery('(max-width: 36em)');
  const geocode = useGeocodeAddress(organizationId);
  const [locateProblem, setLocateProblem] = useState<LocateProblem | null>(null);
  // The answer arrives after the person may have kept typing: it applies to the address as it is then.
  const latestDraft = useRef(draft);
  useEffect(() => {
    latestDraft.current = draft;
  });

  function updateAddress(field: AddressField, value: string | null) {
    setLocateProblem(null);
    onChange({
      ...draft,
      form: { ...form, [field]: value },
      errors: { ...errors, [field]: undefined },
      changed: true,
      // The pin was placed for the old address.
      moved: false,
    });
  }

  function movePin(dropped: { latitude: number; longitude: number }) {
    onChange({ ...draft, point: dropped, moved: true });
  }

  function locate() {
    const formErrors = validateAddress(form);
    const address = addressRequest(form);
    if (hasErrors(formErrors) || !address) {
      onChange({ ...draft, errors: { ...errors, ...formErrors } });
      return;
    }
    setLocateProblem(null);
    geocode.mutate(address, {
      onSuccess: (found) => {
        const current = latestDraft.current;
        if (!sameAddress(addressRequest(current.form), address)) return;
        if (found) {
          // Sent as the pin when saving, so the backend keeps this point instead of locating it again.
          onChange({ ...current, point: found, moved: true });
        } else {
          setLocateProblem('notFound');
        }
      },
      onError: () => {
        setLocateProblem('failed');
      },
    });
  }

  // A point is only missing or stale while the address changed (or was never found) and the pin was not placed.
  const canLocate = !draft.moved && (draft.changed || !point);
  const locateButton = canLocate && (
    <Button
      variant="light"
      size="compact-sm"
      leftSection={<IconMapSearch size={16} aria-hidden />}
      loading={geocode.isPending}
      onClick={locate}
    >
      Ubicar en el mapa
    </Button>
  );
  const locateMessage =
    locateProblem === 'notFound'
      ? 'No encontramos esa dirección. Revisá que la calle, la localidad y el partido estén bien escritos.'
      : locateProblem === 'failed'
        ? 'No pudimos ubicarla ahora. Probá de nuevo en un rato, o guardá y la ubicamos al guardar.'
        : null;

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
          <DistrictInput
            id={id('district')}
            province={form.province}
            maxLength={100}
            value={form.district}
            error={errors.district}
            onChange={(value) => {
              updateAddress('district', value);
            }}
          />
        </div>
        <div>
          <FieldHeader
            htmlFor={id('locality')}
            label="Localidad/Barrio"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <LocalityInput
            id={id('locality')}
            province={form.province}
            district={form.district}
            maxLength={100}
            value={form.locality}
            error={errors.locality}
            onChange={(value) => {
              updateAddress('locality', value);
            }}
            onDistrictFound={(district) => {
              updateAddress('district', district);
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
        <StreetInput
          id={id('street')}
          province={form.province}
          district={form.district}
          maxLength={200}
          value={form.street}
          error={errors.street}
          onChange={(value) => {
            updateAddress('street', value);
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
                onMove={movePin}
              />
            </Suspense>
            <Text size="sm" c={locateProblem ? 'red' : 'dimmed'} aria-live="polite">
              {locateMessage ??
                (canLocate
                  ? 'Cambiaste la dirección: ubicala para revisar el pin, o la ubicamos al guardar.'
                  : 'Lo ubicamos a partir de la dirección. Si no quedó bien, arrastrá el pin.')}
            </Text>
            <Group gap="xs">
              {locateButton}
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconArrowsMaximize size={16} aria-hidden />}
                onClick={() => {
                  setMapExpanded(true);
                }}
              >
                Ver más grande
              </Button>
            </Group>
            <Modal
              opened={mapExpanded}
              onClose={() => {
                setMapExpanded(false);
              }}
              title="Punto en el mapa"
              size="80rem"
              fullScreen={smallScreen}
            >
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Acercá el mapa para ver bien dónde quedó el pin y, si hace falta, arrastralo. El
                  cambio se guarda con el botón «Guardar cambios».
                </Text>
                <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
                  <LocationMap
                    latitude={point.latitude}
                    longitude={point.longitude}
                    label={`Mapa ampliado con el punto de ${mapSubject}. Podés arrastrar el pin para corregirlo.`}
                    onMove={movePin}
                    large
                  />
                </Suspense>
                <Group justify="flex-end">
                  <Button
                    onClick={() => {
                      setMapExpanded(false);
                    }}
                  >
                    Listo
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </Stack>
        ) : (
          <Stack gap="xs" align="flex-start">
            <Alert color="yellow" icon={<IconMapPinOff aria-hidden />} w="100%">
              <span aria-live="polite">
                {locateMessage ??
                  (draft.changed
                    ? 'Ubicá la dirección para ver el pin, o la ubicamos al guardar.'
                    : 'No pudimos ubicar la dirección en el mapa. Revisá que la calle, la localidad y el partido estén bien escritos y volvé a ubicarla.')}
              </span>
            </Alert>
            {locateButton}
          </Stack>
        )}
      </div>
    </Stack>
  );
}
