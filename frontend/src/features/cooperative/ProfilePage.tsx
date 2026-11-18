import { Alert, Button, Group, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconExternalLink } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';
import { Visibility, type CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import { useManagedProfile, useSaveProfileSection } from './api/useManagedProfile';
import { ActivitySection } from './components/profile/ActivitySection';
import { ContactSection } from './components/profile/ContactSection';
import { IdentificationSection } from './components/profile/IdentificationSection';
import { LocationSection } from './components/profile/LocationSection';
import { PhotosSection } from './components/profile/PhotosSection';
import {
  isProfileSection,
  PROFILE_SECTIONS,
  sectionStatus,
  type ProfileSectionKey,
} from './components/profile/profileStatus';
import type { SectionProps } from './components/profile/sectionProps';
import { VisibilityBadge } from './components/profile/Visibility';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './ProfilePage.module.css';

/** "Mi ficha": the profile of the active organization, edited section by section, with the visibility of each field. */
export function ProfilePage() {
  const organization = useActiveOrganization();
  if (!organization) {
    return (
      <Text c="dimmed">
        Vas a poder completar tu ficha cuando el observatorio apruebe tu solicitud.
      </Text>
    );
  }
  // Remounted per organization, so the forms never mix the data of two of them.
  return <ProfileEditor key={organization.id} organizationId={organization.id} />;
}

function ProfileEditor({ organizationId }: { organizationId: string }) {
  const { data: profile, isPending, isError } = useManagedProfile(organizationId);

  return (
    <Stack gap={24}>
      <Group justify="space-between" align="flex-start" gap="md">
        <Stack gap={6} maw={640}>
          <Title order={1} fz={32}>
            Mi ficha
          </Title>
          <Text c="dimmed">
            Estos datos arman la ficha pública
            {profile && (
              <>
                {' '}
                de <strong>{profile.identification.name}</strong>
              </>
            )}
            . Vos elegís qué datos de contacto se muestran.
          </Text>
        </Stack>
        {profile && (
          <Button
            component={Link}
            to={`/organizations/${profile.slug}`}
            variant="outline"
            h={44}
            rightSection={<IconExternalLink size={18} aria-hidden />}
          >
            Ver mi ficha pública
          </Button>
        )}
      </Group>
      <VisibilityLegend />
      {isPending && <Text role="status">Cargando tu ficha…</Text>}
      {isError && (
        <Alert
          color="red"
          icon={<IconAlertCircle aria-hidden />}
          title="No pudimos cargar tu ficha"
        >
          Probá de nuevo en unos minutos.
        </Alert>
      )}
      {profile && <Sections profile={profile} />}
    </Stack>
  );
}

function VisibilityLegend() {
  return (
    <Paper withBorder radius="lg" px={20} py={16} component="section" aria-labelledby="legend">
      <Stack gap={10}>
        <Text fw={700} id="legend" component="h2" fz="sm" m={0}>
          Quién ve cada dato
        </Text>
        <div className={styles.legendRow}>
          <span className={styles.legendSample}>
            <VisibilityBadge visibility={Visibility.PUBLIC} />
          </span>
          <Text size="sm" c="dimmed">
            Visible para visitantes externos.
          </Text>
        </div>
        <div className={styles.legendRow}>
          <span className={styles.legendSample}>
            <VisibilityBadge visibility={Visibility.PRIVATE} />
          </span>
          <Text size="sm" c="dimmed">
            Visible únicamente para el observatorio.
          </Text>
        </div>
        <div className={styles.legendRow}>
          {/* A picture of the toggle, not a control: the text next to it says what it means. */}
          <span className={styles.legendSample} aria-hidden="true">
            <span className={styles.toggleSample}>
              <span className={styles.toggleSampleOn}>Público</span>
              <span>Privado</span>
            </span>
          </span>
          <Text size="sm" c="dimmed">
            Lo configurás vos: elegís si el dato es visible o no para visitantes externos.
          </Text>
        </div>
      </Stack>
    </Paper>
  );
}

function Sections({ profile }: { profile: CooperativeOrganizationProfileResponse }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('section');
  const current: ProfileSectionKey = isProfileSection(requested) ? requested : 'identification';
  const { mutateAsync, isPending, variables } = useSaveProfileSection(profile.id);

  function go(section: ProfileSectionKey) {
    setSearchParams({ section }, { replace: true });
  }

  function props(section: ProfileSectionKey): SectionProps {
    const index = PROFILE_SECTIONS.findIndex(({ key }) => key === section);
    const following = PROFILE_SECTIONS[index + 1];
    return {
      profile,
      hidden: section !== current,
      saving: isPending && variables.section === section,
      next: following && {
        label: following.label,
        go: () => {
          go(following.key);
        },
      },
      save: mutateAsync,
    };
  }

  return (
    <div className={styles.layout}>
      <nav aria-label="Secciones de la ficha" className={styles.nav}>
        {PROFILE_SECTIONS.map(({ key, label }) => {
          const status = sectionStatus(profile, key);
          return (
            <UnstyledButton
              key={key}
              type="button"
              className={styles.navButton}
              aria-current={key === current ? 'step' : undefined}
              onClick={() => {
                go(key);
              }}
            >
              <span className={styles.navText}>
                <span>{label}</span>
                <span className={status.complete ? styles.done : styles.pending}>
                  {status.label}
                </span>
              </span>
              {status.complete ? (
                <IconCircleCheck size={20} aria-hidden className={styles.doneIcon} />
              ) : (
                <span aria-hidden className={styles.pendingDot} />
              )}
            </UnstyledButton>
          );
        })}
      </nav>
      <div className={styles.section}>
        <IdentificationSection {...props('identification')} />
        <ActivitySection {...props('activity')} />
        <PhotosSection hidden={current !== 'photos'} next={props('photos').next} />
        <LocationSection {...props('location')} />
        <ContactSection {...props('contact')} />
      </div>
    </div>
  );
}
