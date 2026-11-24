import { AppShell, Box, Burger, Group, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure, useLocalStorage } from '@mantine/hooks';
import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { Brand } from '@/components/layout/Brand';
import { SkipLink } from '@/components/layout/SkipLink';
import { useAuth } from '@/features/auth/useAuth';
import { ACCOUNT_HOME_PATH } from '@/features/account/accountSections';
import { AccountMenu } from '@/features/account/components/AccountMenu';
import { AccountNav } from '@/features/account/components/AccountNav';
import { OrganizationSwitcher } from './components/OrganizationSwitcher';
import { COOPERATIVE_HOME_PATH, COOPERATIVE_SECTIONS } from './cooperativeSections';
import type { CooperativePanelContext } from './useActiveOrganization';
import styles from './CooperativeLayout.module.css';

function chosenOrganizationId(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('organizationId' in state)) return undefined;
  return typeof state.organizationId === 'string' ? state.organizationId : undefined;
}

/** Shell of the cooperative panel: header with the organization switcher and the account, and a side menu. */
export function CooperativeLayout() {
  const { user } = useAuth();
  const [menuOpened, menu] = useDisclosure(false);
  // On a wide screen the menu can shrink to a column of icons; the choice is remembered.
  const [collapsed, setCollapsed] = useLocalStorage({
    key: 'cooperative-menu-collapsed',
    defaultValue: false,
  });
  // The account home sends the organization chosen in its header along with the navigation.
  const location = useLocation();
  const [activeId, setActiveId] = useState(() => chosenOrganizationId(location.state));

  const organizations = user?.organizations ?? [];
  const organization = organizations.find(({ id }) => id === activeId) ?? organizations[0];
  // The panel manages an organization, so accounts without one go to their home, where they ask for it.
  if (!organization) return <Navigate to={ACCOUNT_HOME_PATH} replace />;
  const context: CooperativePanelContext = { organization };

  return (
    <AppShell
      header={{ height: 81 }}
      navbar={{ width: collapsed ? 84 : 279, breakpoint: 'sm', collapsed: { mobile: !menuOpened } }}
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
            <Box visibleFrom="sm">
              <AccountNav />
            </Box>
            <AccountMenu />
          </Group>
        </Group>
      </AppShell.Header>
      {/* AppShell.Navbar is already a <nav>. */}
      <AppShell.Navbar
        id="cooperative-menu"
        aria-label="Panel de la cooperativa"
        className={styles.navbar}
        data-collapsed={collapsed || undefined}
        p={14}
      >
        <Stack gap={20} flex={1}>
          <OrganizationSwitcher
            organizations={organizations}
            active={organization}
            compact={collapsed}
            onChange={setActiveId}
          />
          <div role="group" aria-labelledby="menu-organization">
            <Text id="menu-organization" className={styles.groupTitle}>
              Esta entidad
            </Text>
            {/* Each tooltip goes on a wrapper: it merges its className into its child, and NavLink takes a function. */}
            <Stack gap={4}>
              {COOPERATIVE_SECTIONS.map(({ path, label, icon: Icon }) => (
                <Tooltip key={path} label={label} position="right" disabled={!collapsed}>
                  <div>
                    <NavLink
                      to={path}
                      end={path === COOPERATIVE_HOME_PATH}
                      className={() => styles.navLink}
                      onClick={menu.close}
                    >
                      <Icon size={20} stroke={1.9} aria-hidden />
                      <span className={styles.label}>{label}</span>
                    </NavLink>
                  </div>
                </Tooltip>
              ))}
            </Stack>
          </div>
        </Stack>
        {/* Only on a wide screen: on a phone the menu already opens and closes with the burger. */}
        <Box visibleFrom="sm">
          <Tooltip label="Expandir el menú" position="right" disabled={!collapsed}>
            <UnstyledButton
              className={styles.navLink}
              aria-expanded={!collapsed}
              aria-controls="cooperative-menu"
              onClick={() => {
                setCollapsed((current) => !current);
              }}
            >
              {collapsed ? (
                <IconLayoutSidebarLeftExpand size={20} stroke={1.9} aria-hidden />
              ) : (
                <IconLayoutSidebarLeftCollapse size={20} stroke={1.9} aria-hidden />
              )}
              <span className={styles.label}>
                {collapsed ? 'Expandir el menú' : 'Contraer el menú'}
              </span>
            </UnstyledButton>
          </Tooltip>
        </Box>
      </AppShell.Navbar>
      <AppShell.Main id="main-content" tabIndex={-1} className={styles.main}>
        <div className={styles.content}>
          <Outlet context={context} />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
