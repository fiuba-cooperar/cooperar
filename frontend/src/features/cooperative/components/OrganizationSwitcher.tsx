import { Badge, Menu, Text, UnstyledButton } from '@mantine/core';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';
import type { OrganizationSummary } from '@/api/generated/model';
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

/** Header selector of the organization being managed, with the entry to add another one. */
export function OrganizationSwitcher({
  organizations,
  active,
  onChange,
}: {
  organizations: OrganizationSummary[];
  active: OrganizationSummary;
  onChange: (id: string) => void;
}) {
  return (
    <Menu
      position="bottom-end"
      offset={6}
      width="max-content"
      classNames={{
        dropdown: styles.dropdown,
        label: styles.label,
        item: styles.item,
        divider: styles.divider,
      }}
    >
      <Menu.Target>
        <UnstyledButton className={styles.trigger}>
          <span aria-hidden className={styles.initials}>
            {organizationInitials(active.name)}
          </span>
          <span className={styles.labels}>
            <Text size="xs" c="dimmed" component="span">
              Cooperativa
            </Text>
            <Text fw={700} fz={15} component="span" truncate="end" maw={{ base: 120, md: 360 }}>
              {active.name}
            </Text>
          </span>
          <IconChevronDown size={18} stroke={2.2} aria-hidden />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>Tus cooperativas</Menu.Label>
        {organizations.map((organization) => {
          const selected = organization.id === active.id;
          return (
            <Menu.Item
              key={organization.id}
              aria-current={selected ? 'true' : undefined}
              data-selected={selected || undefined}
              rightSection={selected ? <IconCheck size={18} stroke={2.4} aria-hidden /> : undefined}
              onClick={() => {
                onChange(organization.id);
              }}
            >
              {organization.name}
            </Menu.Item>
          );
        })}
        <Menu.Divider />
        {/* TODO(#67): link to the "add a cooperative" flow. */}
        <Menu.Item
          disabled
          rightSection={
            <Badge variant="light" size="sm">
              Próximamente
            </Badge>
          }
        >
          + Agregar cooperativa
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
