import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconCurrentLocation } from '@tabler/icons-react';
import type { VisitorLocation } from '../useVisitorLocation';

/** The invitation to share the location, and why it did not work when it did not. */
export function LocateMe({
  location,
  onLocate,
}: {
  location: VisitorLocation;
  onLocate: () => void;
}) {
  if (location.status === 'located') return null;
  return (
    <Stack gap="xs" align="flex-start">
      <Button
        variant="light"
        leftSection={<IconCurrentLocation size={18} aria-hidden />}
        loading={location.status === 'locating'}
        onClick={onLocate}
      >
        Ver las más cercanas a mí
      </Button>
      <Text size="xs" c="dimmed">
        Tu ubicación queda en tu navegador: no la mandamos ni la guardamos.
      </Text>
      {location.status === 'denied' && (
        <Alert color="yellow" role="status" w="100%">
          No nos diste permiso para ver tu ubicación. Podés darlo desde la configuración del
          navegador, o buscar en el mapa.
        </Alert>
      )}
      {location.status === 'unavailable' && (
        <Alert color="yellow" role="status" w="100%">
          No pudimos saber dónde estás. Probá de nuevo, o buscá en el mapa.
        </Alert>
      )}
    </Stack>
  );
}
