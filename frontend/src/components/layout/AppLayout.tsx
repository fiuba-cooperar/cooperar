import { Anchor, Burger, Button, Container, Drawer, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ROLE_HOME } from '@/features/auth/roleHome';
import { useAuth } from '@/features/auth/useAuth';
import styles from './AppLayout.module.css';
import { PUBLIC_SECTIONS, REGISTER_PATH } from './publicSections';

function AccountActions({ onNavigate }: { onNavigate?: () => void }) {
  const { status, user, logout } = useAuth();

  if (user) {
    return (
      <>
        <Anchor component={Link} to={ROLE_HOME[user.role]} fw={600} size="sm" onClick={onNavigate}>
          Mi sección
        </Anchor>
        <Anchor component="button" type="button" fw={600} size="sm" onClick={() => void logout()}>
          Cerrar sesión
        </Anchor>
      </>
    );
  }
  if (status !== 'anonymous') return null;
  return (
    <>
      <Button
        component={Link}
        to="/login"
        variant="outline"
        h={44}
        px={18}
        fz={15}
        onClick={onNavigate}
      >
        Ingresar
      </Button>
      <Button component={Link} to={REGISTER_PATH} h={44} px={18} fz={15} onClick={onNavigate}>
        Registrá tu organización
      </Button>
    </>
  );
}

function SectionLinks({ onNavigate }: { onNavigate?: () => void }) {
  return PUBLIC_SECTIONS.map(({ path, label }) => (
    <NavLink key={path} to={path} className={() => styles.navLink} onClick={onNavigate}>
      {label}
    </NavLink>
  ));
}

// 44px tall like the other header buttons; tighter on phones so it fits next to the logo in 320px.
const FOCUSED_ACTION_PROPS = {
  h: 44,
  px: { base: 10, sm: 18 },
  fz: { base: 14, sm: 15 },
  miw: 'max-content',
} as const;

function Brand() {
  return (
    <Link to="/" className={styles.brand} aria-label="cooperAR, ir al inicio">
      <img src="/brand/symbol-mocks.png" alt="" />
      <span>
        cooper<span style={{ fontWeight: 600 }}>AR</span>
      </span>
    </Link>
  );
}

export function AppLayout() {
  const { pathname } = useLocation();
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === REGISTER_PATH;
  const focusedAction = isLoginPage ? (
    <Button component={Link} to={REGISTER_PATH} {...FOCUSED_ACTION_PROPS}>
      Registrá tu organización
    </Button>
  ) : isRegisterPage ? (
    <Button component={Link} to="/login" variant="outline" {...FOCUSED_ACTION_PROPS}>
      Ya tengo cuenta
    </Button>
  ) : null;
  // The home page draws its own full-width bands, so it skips the centered container.
  const isHomePage = pathname === '/';
  const [menuOpened, menu] = useDisclosure(false);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Saltar al contenido principal
      </a>
      <header className={styles.header}>
        {/* Same bar on every page, so its height does not jump between screens. */}
        <Container fluid px={{ base: 'md', sm: 48 }} py="md" className={styles.headerBar}>
          {focusedAction ? (
            // The login and register mocks keep only the logo and one action, so the form has no distractions.
            <>
              <Brand />
              <div className={styles.headerEnd}>{focusedAction}</div>
            </>
          ) : (
            // Logo and buttons at the edges and the menu centered, as in the mock.
            <>
              <div className={styles.headerSide}>
                <Brand />
              </div>
              <Group component="nav" aria-label="Principal" gap="lg" visibleFrom="lg">
                <SectionLinks />
              </Group>
              <div className={[styles.headerSide, styles.headerEnd].join(' ')}>
                <Group gap={10} wrap="nowrap" visibleFrom="lg">
                  <AccountActions />
                </Group>
                <Burger
                  opened={menuOpened}
                  onClick={menu.toggle}
                  hiddenFrom="lg"
                  aria-label="Abrir el menú"
                  aria-expanded={menuOpened}
                />
              </div>
            </>
          )}
        </Container>
      </header>
      <Drawer
        opened={menuOpened}
        onClose={menu.close}
        position="right"
        size="xs"
        title="Menú"
        closeButtonProps={{ 'aria-label': 'Cerrar el menú' }}
        hiddenFrom="lg"
      >
        <Stack gap="lg">
          <Stack component="nav" aria-label="Principal" gap="xs">
            <SectionLinks onNavigate={menu.close} />
          </Stack>
          <Stack gap="sm">
            <AccountActions onNavigate={menu.close} />
          </Stack>
        </Stack>
      </Drawer>
      <main
        id="main-content"
        className={[
          styles.main,
          isLoginPage && styles.mainCentered,
          isRegisterPage && styles.mainForm,
          isHomePage && styles.mainFlush,
        ]
          .filter(Boolean)
          .join(' ')}
        tabIndex={-1}
      >
        {isHomePage ? (
          <Outlet />
        ) : (
          <Container size="lg">
            <Outlet />
          </Container>
        )}
      </main>
      {/* Neither the login nor the register mock has a footer. */}
      {!isLoginPage && !isRegisterPage && (
        <footer className={styles.footer}>
          <Container fluid px={{ base: 'md', sm: 48 }} py="lg">
            <Group justify="space-between" gap="sm">
              <Text size="sm" c="dimmed">
                CooperAR · Observatorio de empresas recuperadas
              </Text>
              <Text size="sm" c="dimmed">
                Secretaría de Extensión Universitaria · FIUBA
              </Text>
            </Group>
          </Container>
        </footer>
      )}
    </div>
  );
}
