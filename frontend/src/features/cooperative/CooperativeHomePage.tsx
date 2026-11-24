import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Title,
  VisuallyHidden,
} from '@mantine/core';
import { IconCircle, IconCircleCheck, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/features/auth/useAuth';
import { displayName } from '@/features/auth/userName';
import { ProfileStatus } from './components/ProfileStatus';
import type {
  CooperativeOrganizationProfileResponse,
  OrganizationSummary,
} from '@/api/generated/model';
import { useDismissOnboarding, useManagedProfile } from './api/useManagedProfile';
import { COOPERATIVE_PRODUCTS_PATH, COOPERATIVE_PROFILE_PATH } from './cooperativeSections';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './CooperativeHomePage.module.css';

interface Step {
  key: string;
  title: string;
  description?: string;
  action?: { label: string; path: string; filled: boolean };
  done: boolean;
}

/** The minimum that makes a profile useful: a logo, a description and some way to get in touch. */
function hasTheEssentials(profile: CooperativeOrganizationProfileResponse): boolean {
  const { contact, activity, photos } = profile;
  const contactable = [
    contact.phone,
    contact.whatsapp,
    contact.email,
    contact.website,
    contact.socialMedia,
  ].some(Boolean);
  return Boolean(photos.logoUrl) && Boolean(activity.description) && contactable;
}

function Steps({ organization }: { organization: OrganizationSummary }) {
  const { data: profile } = useManagedProfile(organization.id);
  const dismiss = useDismissOnboarding(organization.id);
  const [confirming, setConfirming] = useState(false);
  const allSteps: Step[] = [
    { key: 'basics', title: 'Datos básicos de la entidad', done: true },
    {
      key: 'profile',
      title: 'Completá tu ficha',
      description: 'Agregá información sobre quiénes son, dónde trabajan y cómo contactarlos.',
      action: { label: 'Completar ficha', path: COOPERATIVE_PROFILE_PATH, filled: false },
      done: profile ? hasTheEssentials(profile) : false,
    },
    {
      // TODO(#19): mark it done once the organization has products.
      key: 'products',
      title: 'Cargá tus primeros productos o servicios',
      description:
        'Contá qué productos o servicios ofrecés para que puedan encontrarte y solicitar un presupuesto.',
      action: { label: 'Agregar producto', path: COOPERATIVE_PRODUCTS_PATH, filled: true },
      done: false,
    },
  ];
  const steps = allSteps;
  const doneCount = steps.filter(({ done }) => done).length;
  // Closed for good by the person, or with nothing left to do: the card has nothing left to ask for.
  if (profile?.onboardingDismissed || steps.every(({ done }) => done)) return null;

  return (
    <Paper component="section" withBorder radius="lg" px={28} py={24} aria-labelledby="steps">
      <Group justify="space-between" align="baseline" gap="xs" mb="sm">
        <Title order={2} id="steps" fz={18} style={{ letterSpacing: 'normal' }}>
          Completá tu presencia en el observatorio
        </Title>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={600} c="brand.8">
            {doneCount} de {steps.length} pasos
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={32}
            aria-label="Cerrar y no volver a mostrar"
            onClick={() => {
              setConfirming(true);
            }}
          >
            <IconX size={18} aria-hidden />
          </ActionIcon>
        </Group>
      </Group>
      <ConfirmDialog
        opened={confirming}
        title="¿Querés cerrar esta guía?"
        icon={<IconX aria-hidden />}
        confirmLabel="Cerrar guía"
        color="brand"
        loading={dismiss.isPending}
        onConfirm={() => {
          dismiss.mutate(undefined, {
            onSettled: () => {
              setConfirming(false);
            },
          });
        }}
        onClose={() => {
          setConfirming(false);
        }}
      >
        No volverá a mostrarse para esta entidad. Podés completar la ficha y cargar productos o
        servicios en cualquier momento.
      </ConfirmDialog>
      <Progress
        value={(doneCount / steps.length) * 100}
        aria-label="Progreso de tu presencia en el observatorio"
        mb="xs"
      />
      <Stack component="ul" gap={0} className={styles.steps}>
        {steps.map(({ key, title, description, action, done }) => (
          <li key={key} className={styles.step}>
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
                  className={styles.stepAction}
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

const COMING_SOON_METRICS = ['Visitas a tu ficha', 'Consultas recibidas', 'Productos más vistos'];

// TODO(#109): replace the placeholders with the real activity of the organization.
/** A first look at the dashboard that is coming: the metrics it will have, with no numbers until there are any. */
function ActivityPreview() {
  return (
    <Paper component="section" withBorder radius="lg" px={28} py={24} aria-labelledby="activity">
      <Group justify="space-between" align="center" gap="xs" mb={4}>
        <Title order={2} id="activity" fz={18} style={{ letterSpacing: 'normal' }}>
          Actividad
        </Title>
        <Badge variant="light" color="gray" tt="none">
          Próximamente
        </Badge>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        Muy pronto vas a ver acá cuántas personas visitan tu entidad y tus productos o servicios.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {COMING_SOON_METRICS.map((metric) => (
          <div key={metric} className={styles.metric}>
            <Text size="sm" c="dimmed">
              {metric}
            </Text>
            <Text fz={28} fw={700} c="dimmed" aria-hidden>
              —
            </Text>
          </div>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

export function CooperativeHomePage() {
  const { user } = useAuth();
  const organization = useActiveOrganization();

  if (!user) return null;

  return (
    <div className={styles.layout}>
      <Stack gap={24} className={styles.main}>
        <Stack gap={6}>
          <Title order={1} fz={32}>
            Hola, {user.firstName ?? displayName(user)}
          </Title>
          <Text c="dimmed" size="md">
            Estás administrando <strong>{organization.name}</strong>. Desde acá controlás cómo te ve
            el público.
          </Text>
        </Stack>
        <Steps organization={organization} />
        <ActivityPreview />
      </Stack>
      <ProfileStatus organization={organization} />
    </div>
  );
}
