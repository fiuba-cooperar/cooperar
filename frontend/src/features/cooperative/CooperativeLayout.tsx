import { AppShell, Burger, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { Brand } from '@/components/layout/Brand';
import { PanelAccount } from '@/components/layout/PanelAccount';
import { SkipLink } from '@/components/layout/SkipLink';
import { useAuth } from '@/features/auth/useAuth';
import { OrganizationSwitcher } from './components/OrganizationSwitcher';
import { COOPERATIVE_HOME_PATH, COOPERATIVE_SECTIONS } from './cooperativeSections';
import type { CooperativePanelContext } from './useActiveOrganization';
import styles from './CooperativeLayout.module.css';

/** Shell of the cooperative panel: header with the organization switcher and the account, and a side menu. */
export function CooperativeLayout() {
  const { user } = useAuth();
  const [menuOpened, menu] = useDisclosure(false);
  const [activeId, setActiveId] = useState<string>();

  const organizations = user?.organizations ?? [];
  const organization = organizations.find(({ id }) => id === activeId) ?? organizations[0];
  const context: CooperativePanelContext = { organization };

  return (
    <AppShell
      header={{ height: 81 }}
      navbar={{ width: 279, breakpoint: 'sm', collapsed: { mobile: !menuOpened } }}
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
              aria-controls="cooperative-menu"
            />
            <Brand />
          </Group>
          <Group gap={12} wrap="nowrap">
            {organization && (
              <OrganizationSwitcher
                organizations={organizations}
                active={organization}
                onChange={setActiveId}
              />
            )}
            <Group visibleFrom="sm" gap={12} wrap="nowrap">
              <span aria-hidden className={styles.separator} />
              <PanelAccount />
            </Group>
          </Group>
        </Group>
      </AppShell.Header>
      {/* AppShell.Navbar is already a <nav>. */}
      <AppShell.Navbar
        id="cooperative-menu"
        aria-label="Panel de la cooperativa"
        className={styles.navbar}
        p={14}
      >
        <Stack gap={4} flex={1}>
          {COOPERATIVE_SECTIONS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === COOPERATIVE_HOME_PATH}
              className={() => styles.navLink}
              onClick={menu.close}
            >
              <Icon size={20} stroke={1.9} aria-hidden />
              {label}
            </NavLink>
          ))}
        </Stack>
        <div className={styles.navbarAccount}>
          <PanelAccount />
        </div>
      </AppShell.Navbar>
      <AppShell.Main id="main-content" tabIndex={-1} className={styles.main}>
        <div className={styles.content}>
          <Outlet context={context} />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
