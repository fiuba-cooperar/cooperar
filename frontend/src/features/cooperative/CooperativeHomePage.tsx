import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconCircle } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { OrganizationStatus } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { displayName } from '@/features/auth/userName';
import { EmailVerificationNotice } from './components/EmailVerificationNotice';
import { OrganizationStatusCard } from './components/OrganizationStatusCard';
import { PublicPreview } from './components/PublicPreview';
import { COOPERATIVE_PRODUCTS_PATH, COOPERATIVE_PROFILE_PATH } from './cooperativeSections';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './CooperativeHomePage.module.css';

// Quick accesses to the two first things to do; their pages are still "coming soon".
const QUICK_ACCESS = [
  {
    title: 'Sumá una descripción y fotos',
    description: 'Contá quiénes son y mostrá su espacio de trabajo.',
    action: 'Completar ficha',
    path: COOPERATIVE_PROFILE_PATH,
    filled: false,
  },
  {
    title: 'Cargá tus primeros productos o servicios',
    description: 'Así te encuentran y te piden presupuesto.',
    action: 'Agregar producto',
    path: COOPERATIVE_PRODUCTS_PATH,
    filled: true,
  },
] as const;

export function CooperativeHomePage() {
  const { user, refreshUser } = useAuth();
  const organization = useActiveOrganization();

  // The review may have finished since the session started, so the statuses are reloaded on every visit.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  if (!user) return null;
  const greetingName = user.firstName ?? displayName(user);

  return (
    <div className={styles.layout}>
      <Stack gap={24} className={styles.main}>
        <Stack gap={6}>
          <Title order={1} fz={32}>
            Hola, {greetingName}
          </Title>
          {organization ? (
            <Text c="dimmed" size="md">
              Estás administrando <strong>{organization.name}</strong>. Desde acá controlás cómo te
              ve el público.
            </Text>
          ) : (
            <Text c="dimmed" size="md">
              Todavía no tenés ninguna organización asociada a tu cuenta.
            </Text>
          )}
        </Stack>
        {!user.emailVerified && <EmailVerificationNotice email={user.email} />}
        {/* An approved organization needs no card: the preview already links to its public profile. */}
        {organization && organization.status !== OrganizationStatus.APPROVED && (
          <OrganizationStatusCard organization={organization} emailVerified={user.emailVerified} />
        )}
        {organization && (
          <Paper component="section" withBorder radius="lg" px={28} py={24} aria-labelledby="steps">
            <Group justify="space-between" align="baseline" gap="xs" mb="sm">
              <Title order={2} id="steps" fz={18} style={{ letterSpacing: 'normal' }}>
                Completá tu presencia en el observatorio
              </Title>
              {/* TODO(#13): show the real progress of the profile. */}
              <Badge variant="light">Próximamente</Badge>
            </Group>
            <Stack component="ul" gap={0} className={styles.steps}>
              {QUICK_ACCESS.map(({ title, description, action, path, filled }) => (
                <li key={path} className={styles.step}>
                  <IconCircle size={24} stroke={2} aria-hidden className={styles.stepIcon} />
                  <div className={styles.stepText}>
                    <Text fw={700}>{title}</Text>
                    <Text size="sm" c="dimmed">
                      {description}
                    </Text>
                  </div>
                  <Button
                    component={Link}
                    to={path}
                    size="sm"
                    h={44}
                    variant={filled ? 'filled' : 'outline'}
                  >
                    {action}
                  </Button>
                </li>
              ))}
            </Stack>
          </Paper>
        )}
      </Stack>
      {organization && <PublicPreview organization={organization} />}
    </div>
  );
}
