import { Button, Group, Modal, Paper, Stack, Text, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconMapPins } from '@tabler/icons-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import {
  AddressType,
  type OrganizationProfileResponse,
  type PublicAddressResponse,
} from '@/api/generated/model';
import type { MapPlace } from '@/components/map/LocationsMap';
import { mainAddress, otherAddresses } from '../addresses';
import { otherAddressTitle, PROVINCE_LABELS } from '../labels';

const LocationMap = lazy(() =>
  import('@/components/map/LocationMap').then((module) => ({ default: module.LocationMap })),
);
const LocationsMap = lazy(() =>
  import('@/components/map/LocationsMap').then((module) => ({ default: module.LocationsMap })),
);

function addressLine(parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(', ');
}

/** Every located address of the organization, the main one first and painted apart. */
function placesOf(addresses: PublicAddressResponse[]): MapPlace[] {
  return addresses.flatMap((address) => {
    if (!address.location) return [];
    const main = address.type === AddressType.MAIN;
    return [
      {
        ...address.location,
        title: main
          ? address.name
            ? `${address.name} · Principal`
            : 'Principal'
          : otherAddressTitle(address.name, address.type, address.district),
        detail: addressLine([
          address.street,
          address.locality,
          address.district,
          PROVINCE_LABELS[address.province],
        ]),
        highlighted: main,
      },
    ];
  });
}

/**
 * The map of the main address and, when the organization has other located addresses, a dialog with all of them on a
 * larger map.
 */
export function ProfileLocations({ profile }: { profile: OrganizationProfileResponse }) {
  const [allOpen, setAllOpen] = useState(false);
  const smallScreen = useMediaQuery('(max-width: 36em)');
  const places = useMemo(() => placesOf(profile.addresses), [profile.addresses]);
  const mainPoint = mainAddress(profile.addresses)?.location;
  const others = otherAddresses(profile.addresses);
  const othersLocated = others.some((other) => other.location);
  if (!mainPoint && !othersLocated) return null;

  return (
    <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="location">
      <Title order={2} size="h4" id="location" mb="sm">
        {others.length > 0 ? 'Ubicación principal' : 'Ubicación'}
      </Title>
      <Stack gap="xs">
        {mainPoint ? (
          <>
            <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
              <LocationMap
                latitude={mainPoint.latitude}
                longitude={mainPoint.longitude}
                approximate={mainPoint.approximate}
                label={
                  mainPoint.approximate
                    ? `Mapa con la zona de ${profile.name}`
                    : `Mapa con la ubicación de ${profile.name}`
                }
              />
            </Suspense>
            {mainPoint.approximate && (
              <Text size="sm" c="dimmed">
                El mapa marca solo la zona: la entidad no publica su dirección exacta.
              </Text>
            )}
          </>
        ) : (
          <Text size="sm" c="dimmed">
            La dirección principal todavía no está en el mapa.
          </Text>
        )}
        {othersLocated && (
          <Group>
            <Button
              variant="light"
              size="compact-sm"
              leftSection={<IconMapPins size={16} aria-hidden />}
              onClick={() => {
                setAllOpen(true);
              }}
            >
              Ver otras ubicaciones
            </Button>
          </Group>
        )}
      </Stack>
      <Modal
        opened={allOpen}
        onClose={() => {
          setAllOpen(false);
        }}
        title={`Ubicaciones de ${profile.name}`}
        size="80rem"
        fullScreen={smallScreen}
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            En azul, la dirección principal; en naranja, las otras. Tocá un pin para ver la
            dirección.
          </Text>
          <Suspense fallback={<Text c="dimmed">Cargando el mapa…</Text>}>
            <LocationsMap
              places={places}
              label={`Mapa con todas las ubicaciones de ${profile.name}`}
            />
          </Suspense>
        </Stack>
      </Modal>
    </Paper>
  );
}
