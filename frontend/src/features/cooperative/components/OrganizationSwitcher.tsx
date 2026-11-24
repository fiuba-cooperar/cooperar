import { Menu, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconPlus, IconSelector } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { OrganizationSummary } from '@/api/generated/model';
import { NEW_REGISTRATION_REQUEST_PATH } from '@/features/account/accountSections';
import styles from './OrganizationSwitcher.module.css';

function organizationInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/** The organization being managed, at the top of the side menu, to switch to another one or to add a new one. */
export function OrganizationSwitcher({
  organizations,
  active,
  compact = false,
  onChange,
}: {
  organizations: OrganizationSummary[];
  active: OrganizationSummary;
  /** Just the initials, when the side menu is collapsed. */
  compact?: boolean;
  /** Gets the slug of the organization chosen. */
  onChange: (slug: string) => void;
}) {
  return (
    <Menu
      position={compact ? 'right-start' : 'bottom-start'}
      offset={6}
      width={compact ? 260 : 'target'}
      classNames={{
        dropdown: styles.dropdown,
        label: styles.label,
        item: styles.item,
        itemLabel: styles.itemLabel,
        divider: styles.divider,
      }}
    >
      <Menu.Target>
        <UnstyledButton
          className={[styles.trigger, compact ? styles.compact : undefined]
            .filter(Boolean)
            .join(' ')}
          // With the name hidden, the button still says which entity it is.
          aria-label={compact ? `${active.name}. Seleccionar entidad` : undefined}
        >
          <span aria-hidden className={styles.initials}>
            {organizationInitials(active.name)}
          </span>
          <span className={styles.labels} hidden={compact}>
            <Text fw={700} fz={15} component="span" truncate="end" maw="100%">
              {active.name}
            </Text>
            <Text size="xs" c="dimmed" component="span">
              Seleccionar entidad
            </Text>
          </span>
          {!compact && <IconSelector size={18} stroke={2.2} aria-hidden />}
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Tus entidades</Menu.Label>
        {organizations.map((organization) => {
          const selected = organization.id === active.id;
          return (
            <Menu.Item
              key={organization.id}
              aria-current={selected ? 'true' : undefined}
              data-selected={selected || undefined}
              rightSection={selected ? <IconCheck size={18} stroke={2.4} aria-hidden /> : undefined}
              onClick={() => {
                onChange(organization.slug);
              }}
            >
              {organization.name}
            </Menu.Item>
          );
        })}
        <Menu.Divider />
        <Menu.Item
          component={Link}
          to={NEW_REGISTRATION_REQUEST_PATH}
          leftSection={<IconPlus size={18} aria-hidden />}
        >
          Crear entidad
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
