import { AppShell, Avatar, Badge, Burger, Button, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconExternalLink } from '@tabler/icons-react';
import { Link, NavLink, Outlet } from 'react-router';
import { Brand } from '@/components/layout/Brand';
import { SkipLink } from '@/components/layout/SkipLink';
import { useAuth } from '@/features/auth/useAuth';
import { displayName, initials } from '@/features/auth/userName';
import { ADMIN_HOME_PATH, ADMIN_SECTIONS } from './adminSections';
import styles from './AdminLayout.module.css';

function Account() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Group gap={12} wrap="nowrap">
      <Avatar variant="filled" color="brand.9" fw={700} aria-hidden>
        {initials(user)}
      </Avatar>
      <Text fw={600} truncate="end" maw={{ base: 160, md: 280 }}>
        {displayName(user)}
      </Text>
      <Button variant="subtle" h={44} px="sm" fz={15} onClick={() => void logout()}>
        Cerrar sesión
      </Button>
    </Group>
  );
}

/** Shell of the observatory panel: header with the signed-in admin and a side menu with the admin sections only. */
export function AdminLayout() {
  const [menuOpened, menu] = useDisclosure(false);

  return (
    <AppShell
      header={{ height: 76 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !menuOpened } }}
      padding={0}
    >
      <SkipLink />
      <AppShell.Header className={styles.header}>
        <Group h="100%" px={{ base: 'md', sm: 32 }} justify="space-between" wrap="nowrap">
          <Group gap={12} wrap="nowrap">
            <Burger
              opened={menuOpened}
              onClick={menu.toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label={menuOpened ? 'Cerrar el menú' : 'Abrir el menú'}
              aria-expanded={menuOpened}
              aria-controls="admin-menu"
            />
            <Brand />
            <Badge variant="light" size="lg" visibleFrom="xs">
              Observatorio
            </Badge>
          </Group>
          <Group visibleFrom="sm">
            <Account />
          </Group>
        </Group>
      </AppShell.Header>
      {/* AppShell.Navbar is already a <nav>. */}
      <AppShell.Navbar
        id="admin-menu"
        aria-label="Panel del observatorio"
        className={styles.navbar}
        p={14}
      >
        <Stack gap={4} flex={1}>
          {ADMIN_SECTIONS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === ADMIN_HOME_PATH}
              className={() => styles.navLink}
              onClick={menu.close}
            >
              <Icon size={20} stroke={1.9} aria-hidden />
              {label}
            </NavLink>
          ))}
          <Link to="/" className={[styles.navLink, styles.publicSiteLink].join(' ')}>
            <IconExternalLink size={20} stroke={1.9} aria-hidden />
            Ver el sitio público
          </Link>
        </Stack>
        <div className={styles.navbarAccount}>
          <Account />
        </div>
      </AppShell.Navbar>
      <AppShell.Main id="main-content" tabIndex={-1} className={styles.main}>
        {/* AppShell.Main already pads by the header and menu sizes, so the page spacing goes inside. */}
        <div className={styles.content}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
