import { Text, UnstyledButton } from '@mantine/core';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { formatDistance } from '../geo';
import type { MapPin } from '../pins';
import styles from './NearbyList.module.css';

interface Props {
  nearby: { item: MapPin; km: number }[];
  /** The key of the chosen pin. */
  selected: string | null;
  onSelect: (key: string) => void;
}

/** The nearest organizations by their nearest address, each one a button that shows that address on the map. */
export function NearbyList({ nearby, selected, onSelect }: Props) {
  return (
    <ol className={styles.list}>
      {nearby.map(({ item: pin, km }) => (
        <li key={pin.key}>
          <UnstyledButton
            className={styles.item}
            aria-pressed={pin.key === selected}
            onClick={() => {
              onSelect(pin.key);
            }}
          >
            <Text fw={600} size="sm" lh={1.3}>
              {pin.organization.name}
            </Text>
            <Text size="xs" c="dimmed">
              {ORGANIZATION_TYPE_LABELS[pin.organization.type]} · {pin.place.locality} ·{' '}
              {formatDistance(km)}
            </Text>
          </UnstyledButton>
        </li>
      ))}
    </ol>
  );
}
