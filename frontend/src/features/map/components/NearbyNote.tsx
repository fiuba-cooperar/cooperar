import { Text } from '@mantine/core';
import { formatDistance } from '../geo';
import { NEARBY_RADIUS_KM, type Nearby } from '../pins';

/** How many organizations the map shows around the visitor, so the range is clear. */
export function NearbyNote({ nearby }: { nearby: Nearby }) {
  const radius = `${String(NEARBY_RADIUS_KM)} km`;
  let text: string;
  if (nearby.count === 1) {
    text = `Hay 1 entidad a menos de ${radius} de tu ubicación.`;
  } else if (nearby.count > 1) {
    text = `Hay ${String(nearby.count)} entidades a menos de ${radius} de tu ubicación.`;
  } else if (nearby.nearestKm === null) {
    text = 'Todavía no hay entidades en el mapa.';
  } else {
    text = `No hay entidades a menos de ${radius} de tu ubicación. La más cercana está ${formatDistance(nearby.nearestKm)}.`;
  }
  return (
    <Text size="sm" c="dimmed" role="status">
      {text}
    </Text>
  );
}
