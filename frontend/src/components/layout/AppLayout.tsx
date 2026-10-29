import { Anchor, Button, Container, Group, Text } from '@mantine/core';
import { Link, Outlet, useLocation } from 'react-router';
import { ROLE_HOME } from '@/features/auth/roleHome';
import { useAuth } from '@/features/auth/useAuth';
import styles from './AppLayout.module.css';

export function AppLayout() {
  const { status, user, logout } = useAuth();
  const isLoginPage = useLocation().pathname === '/login';

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Saltar al contenido principal
      </a>
      <header className={styles.header}>
        {/* The login header spans the full width, as in the mock. */}
        <Container
          size="lg"
          py={isLoginPage ? 'lg' : 'sm'}
          {...(isLoginPage ? { fluid: true, px: 48 } : {})}
        >
          {isLoginPage ? (
            <Group justify="space-between">
              <Anchor component={Link} to="/" fw={500} fz={15} c="inherit" underline="hover">
                ← Volver al sitio
              </Anchor>
              {/* The registration flow does not exist yet, so the button does nothing for now. */}
              <Button type="button" fz={15}>
                Registrá tu cooperativa
              </Button>
            </Group>
          ) : (
            <Group justify="space-between">
              <Link to="/" className={styles.brand} aria-label="cooperAR, ir al inicio">
                <img src="/brand/symbol-mocks.png" alt="" />
                <span>
                  cooper<span style={{ fontWeight: 600 }}>AR</span>
                </span>
              </Link>
              <nav aria-label="Cuenta">
                <Group gap="md">
                  {user ? (
                    <>
                      <Anchor component={Link} to={ROLE_HOME[user.role]} fw={600} size="sm">
                        Mi sección
                      </Anchor>
                      <Anchor
                        component="button"
                        type="button"
                        fw={600}
                        size="sm"
                        onClick={() => void logout()}
                      >
                        Cerrar sesión
                      </Anchor>
                    </>
                  ) : (
                    status === 'anonymous' && (
                      <Button component={Link} to="/login" variant="outline">
                        Ingresar
                      </Button>
                    )
                  )}
                </Group>
              </nav>
            </Group>
          )}
        </Container>
      </header>
      <main
        id="main-content"
        className={[styles.main, isLoginPage && styles.mainCentered].filter(Boolean).join(' ')}
        tabIndex={-1}
      >
        <Container size="lg">
          <Outlet />
        </Container>
      </main>
      {/* The login mock has no footer. */}
      {!isLoginPage && (
        <footer className={styles.footer}>
          <Container size="lg" py="md">
            <Text size="sm" c="dimmed">
              Trabajo Profesional de Ingeniería en Informática, FIUBA, junto a la Secretaría de
              Extensión Universitaria.
            </Text>
          </Container>
        </footer>
      )}
    </div>
  );
}
