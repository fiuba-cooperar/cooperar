import { Button, Group, Paper, Progress, Stack, Text, Title, VisuallyHidden } from '@mantine/core';
import { IconCircle, IconCircleCheck } from '@tabler/icons-react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '@/features/auth/useAuth';
import { displayName } from '@/features/auth/userName';
import { EmailVerificationNotice } from './components/EmailVerificationNotice';
import { RegistrationRequestCard } from './components/RegistrationRequestCard';
import { PublicPreview } from './components/PublicPreview';
import type { OrganizationSummary } from '@/api/generated/model';
import { useManagedProfile } from './api/useManagedProfile';
import { PROFILE_SECTIONS, sectionStatus } from './components/profile/profileStatus';
import { COOPERATIVE_PRODUCTS_PATH, COOPERATIVE_PROFILE_PATH } from './cooperativeSections';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './CooperativeHomePage.module.css';

interface Step {
  title: string;
  description?: string;
  action?: { label: string; path: string; filled: boolean };
  done: boolean;
}

/** Whether every section of the profile that can be filled in today is complete. */
function useProfileComplete(organizationId: string): boolean {
  const { data: profile } = useManagedProfile(organizationId);
  if (!profile) return false;
  return PROFILE_SECTIONS.filter(({ key }) => key !== 'photos').every(
    ({ key }) => sectionStatus(profile, key).complete,
  );
}

function Steps({ organization }: { organization: OrganizationSummary }) {
  const profileComplete = useProfileComplete(organization.id);
  const steps: Step[] = [
    { title: 'Datos básicos de la entidad', done: true },
    {
      title: 'Completá tu ficha',
      description: 'Contá quiénes son, dónde están y cómo contactarlos.',
      action: { label: 'Completar ficha', path: COOPERATIVE_PROFILE_PATH, filled: false },
      done: profileComplete,
    },
    {
      // TODO(#19): mark it done once the organization has products.
      title: 'Cargá tus primeros productos o servicios',
      description: 'Así te encuentran y te piden presupuesto.',
      action: { label: 'Agregar producto', path: COOPERATIVE_PRODUCTS_PATH, filled: true },
      done: false,
    },
  ];
  const doneCount = steps.filter(({ done }) => done).length;

  return (
    <Paper component="section" withBorder radius="lg" px={28} py={24} aria-labelledby="steps">
      <Group justify="space-between" align="baseline" gap="xs" mb="sm">
        <Title order={2} id="steps" fz={18} style={{ letterSpacing: 'normal' }}>
          Completá tu presencia en el observatorio
        </Title>
        <Text size="sm" fw={600} c="brand.8">
          {doneCount} de {steps.length} pasos
        </Text>
      </Group>
      <Progress
        value={(doneCount / steps.length) * 100}
        aria-label="Progreso de tu presencia en el observatorio"
        mb="xs"
      />
      <Stack component="ul" gap={0} className={styles.steps}>
        {steps.map(({ title, description, action, done }) => (
          <li key={title} className={styles.step}>
            {done ? (
              <IconCircleCheck size={24} stroke={2} aria-hidden className={styles.stepDone} />
            ) : (
              <IconCircle size={24} stroke={2} aria-hidden className={styles.stepIcon} />
            )}
            <div className={styles.stepText}>
              <Text fw={done ? 400 : 700} {...(done && { c: 'dimmed' })}>
                {title}
                <VisuallyHidden component="span">
                  {done ? ' (listo)' : ' (pendiente)'}
                </VisuallyHidden>
              </Text>
              {!done && description && (
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              )}
            </div>
            {done ? (
              <Text size="sm" c="dimmed" aria-hidden>
                Listo
              </Text>
            ) : (
              action && (
                <Button
                  component={Link}
                  to={action.path}
                  size="sm"
                  h={44}
                  variant={action.filled ? 'filled' : 'outline'}
                >
                  {action.label}
                </Button>
              )
            )}
          </li>
        ))}
      </Stack>
    </Paper>
  );
}

export function CooperativeHomePage() {
  const { user, refreshUser } = useAuth();
  const organization = useActiveOrganization();

  // The review may have finished since the session started, so requests and organizations are reloaded on every visit.
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
              {user.registrationRequests.length > 0
                ? 'Cuando el observatorio apruebe tu solicitud, vas a poder administrar tu entidad desde acá.'
                : 'Todavía no tenés ninguna entidad asociada a tu cuenta.'}
            </Text>
          )}
        </Stack>
        {!user.emailVerified && <EmailVerificationNotice email={user.email} />}
        {user.registrationRequests.map((request) => (
          <RegistrationRequestCard
            key={request.id}
            request={request}
            emailVerified={user.emailVerified}
          />
        ))}
        {organization && <Steps organization={organization} />}
      </Stack>
      {organization && <PublicPreview organization={organization} />}
    </div>
  );
}
