import { AppShell, Group } from '@mantine/core';
import { Outlet, useMatch } from 'react-router';
import { Brand } from '@/components/layout/Brand';
import { SkipLink } from '@/components/layout/SkipLink';
import { ACCOUNT_HOME_PATH } from './accountSections';
import { AccountMenu } from './components/AccountMenu';
import { AccountNav } from './components/AccountNav';
import styles from './AccountLayout.module.css';

/** Shell of the pages that belong to the account itself: a header with the logo, its home and the account menu. */
export function AccountLayout() {
  // The home is a dashboard that uses the width; the forms and lists keep a reading width.
  const isHome = useMatch({ path: ACCOUNT_HOME_PATH, end: true }) !== null;
  return (
    <AppShell header={{ height: 81 }} padding={0}>
      <SkipLink />
      <AppShell.Header className={styles.header}>
        <Group h="100%" px={{ base: 'md', sm: 32 }} justify="space-between" wrap="nowrap">
          <Brand />
          <Group gap={12} wrap="nowrap">
            <AccountNav />
            <AccountMenu />
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main id="main-content" tabIndex={-1} className={styles.main}>
        <div className={[styles.content, isHome && styles.wide].filter(Boolean).join(' ')}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}
