import { Alert, Button, Group, NavLink, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconExternalLink } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';
import type { CooperativeProfileResponse } from '@/api/generated/model';
import { useManagedProfile } from '../api/useManagedProfile';
import { useActiveOrganization } from '../useActiveOrganization';
import { ActivitySection } from './ActivitySection';
import { ContactSection } from './ContactSection';
import { IdentificationSection } from './IdentificationSection';
import { LocationSection } from './LocationSection';
import {
  isProfileSection,
  missingInSection,
  PROFILE_SECTIONS,
  type ProfileSectionKey,
} from './profileSections';
import { VisibilityBadge } from './ProfileField';

/** "Mi ficha": the profile of the active organization, edited one section at a time. */
export function ProfilePage() {
  const organization = useActiveOrganization();
  return (
    <Stack gap={24}>
      <title>Mi ficha · CooperAR</title>
      <Group justify="space-between" align="flex-end" gap="md">
        <Stack gap={6} maw={640}>
          <Title order={1} fz={32}>
            Mi ficha
          </Title>
          {organization && (
            <Text c="dimmed">
              Estos datos arman la ficha pública de <strong>{organization.name}</strong>. Vos elegís
              qué datos de contacto se muestran.
            </Text>
          )}
        </Stack>
        {organization && (
          <Button
            component={Link}
            to={`/organizations/${organization.slug}`}
            variant="outline"
            rightSection={<IconExternalLink size={18} aria-hidden />}
          >
            Ver mi ficha pública
          </Button>
        )}
      </Group>
      {organization ? (
        // Keyed by organization so switching it never shows the previous one's data in the forms.
        <ProfileEditor key={organization.id} organizationId={organization.id} />
      ) : (
        <Alert color="yellow">
          Todavía no tenés ninguna entidad aprobada para editar su ficha.
        </Alert>
      )}
    </Stack>
  );
}

function ProfileEditor({ organizationId }: { organizationId: string }) {
  const { data: profile, isPending, isError } = useManagedProfile(organizationId);
  if (isPending) return <Text role="status">Cargando la ficha…</Text>;
  if (isError) {
    return (
      <Alert color="red" title="No pudimos cargar la ficha">
        Probá de nuevo en unos minutos.
      </Alert>
    );
  }
  return <Editor profile={profile} />;
}

function Editor({ profile }: { profile: CooperativeProfileResponse }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get('section');
  const current: ProfileSectionKey = isProfileSection(requested) ? requested : 'identification';
  const index = PROFILE_SECTIONS.findIndex(({ key }) => key === current);
  const next = PROFILE_SECTIONS[index + 1];

  function go(key: ProfileSectionKey) {
    setParams({ section: key }, { replace: true });
  }
  const sectionProps = {
    profile,
    nextLabel: next?.label,
    ...(next && {
      onNext: () => {
        go(next.key);
      },
    }),
  };

  return (
    <Stack gap="lg">
      <Paper withBorder radius="lg" px={20} py={16}>
        <Stack gap={10}>
          <Text fw={600} size="sm">
            Quién ve cada dato
          </Text>
          <Group gap="sm">
            <VisibilityBadge visibility="public" />
            <Text size="sm" c="dimmed">
              Visible para visitantes externos.
            </Text>
          </Group>
          <Group gap="sm">
            <VisibilityBadge visibility="private" />
            <Text size="sm" c="dimmed">
              Visible únicamente para el observatorio.
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            Donde ves el selector Público / Privado, lo configurás vos: elegís si el dato es visible
            o no para visitantes externos.
          </Text>
        </Stack>
      </Paper>
      <Group align="flex-start" gap={28} wrap="wrap">
        <nav aria-label="Secciones de la ficha" style={{ flex: '0 0 240px' }}>
          <Stack gap={4}>
            {PROFILE_SECTIONS.map(({ key, label }) => {
              const missing = missingInSection(key, profile);
              return (
                <NavLink
                  key={key}
                  component="button"
                  type="button"
                  active={key === current}
                  aria-current={key === current ? 'step' : undefined}
                  label={label}
                  description={missing ?? 'Completo'}
                  leftSection={
                    missing ? (
                      <IconAlertCircle size={20} aria-hidden />
                    ) : (
                      <IconCircleCheck size={20} aria-hidden />
                    )
                  }
                  onClick={() => {
                    go(key);
                  }}
                />
              );
            })}
          </Stack>
        </nav>
        <div style={{ flex: '999 1 520px', minWidth: 0 }}>
          {/* Keyed so each section starts from the saved profile when it is opened. */}
          {current === 'identification' && (
            <IdentificationSection key={current} {...sectionProps} />
          )}
          {current === 'activity' && <ActivitySection key={current} {...sectionProps} />}
          {current === 'location' && <LocationSection key={current} {...sectionProps} />}
          {current === 'contact' && <ContactSection key={current} {...sectionProps} />}
        </div>
      </Group>
    </Stack>
  );
}
