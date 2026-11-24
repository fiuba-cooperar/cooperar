import { Avatar, Badge, Menu, Text, UnstyledButton } from '@mantine/core';
import {
  IconBell,
  IconBuildingCommunity,
  IconChevronDown,
  IconLogout,
  IconPlus,
  IconSend,
  IconUser,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';
import { displayName, initials } from '@/features/auth/userName';
import {
  ACCOUNT_HOME_PATH,
  ACCOUNT_NOTIFICATIONS_PATH,
  ACCOUNT_REGISTRATION_REQUESTS_PATH,
  NEW_REGISTRATION_REQUEST_PATH,
} from '../accountSections';
import styles from './AccountMenu.module.css';

/** The signed-in person in the header, with what belongs to the account: its entities, a new request and sign-out. */
export function AccountMenu() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Menu
      position="bottom-end"
      offset={6}
      width="max-content"
      classNames={{ dropdown: styles.dropdown, item: styles.item, divider: styles.divider }}
    >
      <Menu.Target>
        <UnstyledButton className={styles.trigger}>
          <Avatar variant="filled" size={36} fz={14} fw={700} className={styles.avatar} aria-hidden>
            {initials(user)}
          </Avatar>
          <Text fw={600} fz={15} truncate="end" maw={240} visibleFrom="sm">
            {displayName(user)}
          </Text>
          <IconChevronDown size={18} stroke={2.2} aria-hidden />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          to={ACCOUNT_HOME_PATH}
          leftSection={<IconBuildingCommunity size={18} aria-hidden />}
        >
          Mis entidades
        </Menu.Item>
        <Menu.Item
          component={Link}
          to={NEW_REGISTRATION_REQUEST_PATH}
          leftSection={<IconPlus size={18} aria-hidden />}
        >
          Crear entidad
        </Menu.Item>
        <Menu.Item
          component={Link}
          to={ACCOUNT_NOTIFICATIONS_PATH}
          leftSection={<IconBell size={18} aria-hidden />}
        >
          Notificaciones
        </Menu.Item>
        <Menu.Item
          component={Link}
          to={ACCOUNT_REGISTRATION_REQUESTS_PATH}
          leftSection={<IconSend size={18} aria-hidden />}
        >
          Solicitudes de alta
        </Menu.Item>
        <Menu.Item
          disabled
          leftSection={<IconUser size={18} aria-hidden />}
          rightSection={
            <Badge variant="light" color="gray" tt="none" fw={600}>
              Próximamente
            </Badge>
          }
        >
          Mi cuenta
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconLogout size={18} aria-hidden />} onClick={() => void logout()}>
          Cerrar sesión
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
