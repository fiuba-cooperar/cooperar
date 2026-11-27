import { AppShell, Group } from '@mantine/core';
import { useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useMatch } from 'react-router';
import { BackLink } from '@/components/BackLink';
import { Brand } from '@/components/layout/Brand';
import { SkipLink } from '@/components/layout/SkipLink';
import { ACCOUNT_HOME_PATH } from './accountSections';
import { AccountMenu } from './components/AccountMenu';
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell';
import { AccountNav } from './components/AccountNav';
import styles from './AccountLayout.module.css';

/** Shell of the pages that belong to the account itself: a header with the logo, its home and the account menu. */
export function AccountLayout() {
  // The home is a dashboard that uses the width; the forms and lists keep a reading width.
  const isHome = useMatch({ path: ACCOUNT_HOME_PATH, end: true }) !== null;
  const { pathname } = useLocation();
  // Going back to the home is offered only on a page reached from a link of the home's own content. The header (the
  // bell, the account menu) is there on every page, so following it does not count as leaving the home.
  const [fromHome, setFromHome] = useState(false);
  const clickedInMain = useRef(false);
  const previousPathname = useRef(pathname);
  // Before painting, so the link does not appear a moment later and push the page down.
  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    setFromHome(previousPathname.current === ACCOUNT_HOME_PATH && clickedInMain.current);
    previousPathname.current = pathname;
    clickedInMain.current = false;
  }, [pathname]);
  return (
    <AppShell header={{ height: 81 }} padding={0}>
      <SkipLink />
      <AppShell.Header
        className={styles.header}
        onClickCapture={() => {
          clickedInMain.current = false;
        }}
      >
        <Group h="100%" px={{ base: 'md', sm: 32 }} justify="space-between" wrap="nowrap">
          <Brand />
          <Group gap={0} wrap="nowrap">
            <AccountNav />
            {/* The link to the home has its own padding and the bell has room around its icon: these gaps leave the same
                visible space on both sides of the bell. */}
            <Group gap={16} wrap="nowrap">
              <NotificationsBell />
              <AccountMenu />
            </Group>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main
        id="main-content"
        tabIndex={-1}
        className={styles.main}
        onClickCapture={() => {
          clickedInMain.current = true;
        }}
      >
        <div className={[styles.content, isHome && styles.wide].filter(Boolean).join(' ')}>
          {!isHome && fromHome && (
            <div className={styles.back}>
              <BackLink to={ACCOUNT_HOME_PATH}>Volver a Inicio</BackLink>
            </div>
          )}
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
