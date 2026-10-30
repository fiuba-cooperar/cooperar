import { Radio, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAffiliate,
  IconBuildingFactory2,
  IconUsersGroup,
  type Icon,
} from '@tabler/icons-react';
import { OrganizationType } from '@/api/generated/model';
import styles from './OrganizationTypePicker.module.css';

const OPTIONS: { value: OrganizationType; title: string; description: string; icon: Icon }[] = [
  {
    value: OrganizationType.COOPERATIVE,
    title: 'Cooperativa',
    description: 'Cooperativa de trabajo',
    icon: IconUsersGroup,
  },
  {
    value: OrganizationType.ERT,
    title: 'Empresa recuperada',
    description: 'Recuperada por sus trabajadores',
    icon: IconBuildingFactory2,
  },
  {
    value: OrganizationType.COOPERATIVE_AND_ERT,
    title: 'Ambas',
    description: 'Empresa recuperada organizada como cooperativa',
    icon: IconAffiliate,
  },
];

const TYPES = Object.values(OrganizationType);

interface OrganizationTypePickerProps {
  value: OrganizationType | null;
  onChange: (value: OrganizationType) => void;
  error?: string | undefined;
}

/** Cooperative, ERT or both, as a group of selectable cards. */
export function OrganizationTypePicker({ value, onChange, error }: OrganizationTypePickerProps) {
  return (
    <Radio.Group
      label="Tipo de organización"
      name="organization-type"
      // Same error size and gap as the text fields below.
      size="md"
      styles={{ error: { marginTop: 'calc(var(--mantine-spacing-xs) / 2)' } }}
      value={value}
      error={error}
      onChange={(selected) => {
        const type = TYPES.find((candidate) => candidate === selected);
        if (type) onChange(type);
      }}
    >
      <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
        {OPTIONS.map(({ value: option, title, description, icon: OptionIcon }, index) => (
          <Radio.Card
            key={option}
            value={option}
            className={styles.card}
            // Roving tabindex: Tab enters the group once and the arrow keys move between cards, like native radios.
            tabIndex={(value === null ? index === 0 : value === option) ? 0 : -1}
          >
            <Radio.Indicator className={styles.indicator} aria-hidden="true" />
            <Stack gap={6}>
              <ThemeIcon
                variant={value === option ? 'filled' : 'light'}
                size={40}
                radius="md"
                aria-hidden="true"
              >
                <OptionIcon size={24} stroke={1.8} />
              </ThemeIcon>
              <Text fw={600} fz={15} lh={1.3}>
                {title}
              </Text>
              <Text fz={13} c="dimmed" lh={1.4}>
                {description}
              </Text>
            </Stack>
          </Radio.Card>
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}
