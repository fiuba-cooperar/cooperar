import { Text, UnstyledButton } from '@mantine/core';
import type { OrganizationMapPointResponse } from '@/api/generated/model';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { formatDistance } from '../geo';
import styles from './NearbyList.module.css';

interface Props {
  nearby: { place: OrganizationMapPointResponse; km: number }[];
  selected: string | null;
  onSelect: (slug: string) => void;
}

/** The nearest organizations, each one a button that shows it on the map. */
export function NearbyList({ nearby, selected, onSelect }: Props) {
  return (
    <ol className={styles.list}>
      {nearby.map(({ place, km }) => (
        <li key={place.slug}>
          <UnstyledButton
            className={styles.item}
            aria-pressed={place.slug === selected}
            onClick={() => {
              onSelect(place.slug);
            }}
          >
            <Text fw={600} size="sm" lh={1.3}>
              {place.name}
            </Text>
            <Text size="xs" c="dimmed">
              {ORGANIZATION_TYPE_LABELS[place.type]} · {place.locality} · {formatDistance(km)}
            </Text>
          </UnstyledButton>
        </li>
      ))}
    </ol>
  );
}
