import { Alert, Button, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconCircleCheck, IconEye, IconExternalLink } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useBlocker, useSearchParams } from 'react-router';
import { Visibility, type CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import { AppModal } from '@/components/AppModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  type SectionStatus,
  type ProfileSectionKey,
} from './components/profile/profileStatus';
import type { SectionProps } from './components/profile/sectionProps';
import { VisibilityBadge, VisibilityToggle } from './components/profile/Visibility';
import { useActiveOrganization } from './useActiveOrganization';
import styles from './ProfilePage.module.css';

/** "Ficha": the profile of the active organization, edited section by section, with the visibility of each field. */
export function ProfilePage() {
  const organization = useActiveOrganization();
  // Remounted per organization, so the forms never mix the data of two of them.
  return <ProfileEditor key={organization.id} organizationId={organization.id} />;
}

function ProfileEditor({ organizationId }: { organizationId: string }) {
  const { data: profile, isPending, isError } = useManagedProfile(organizationId);

  return (
    <Stack gap={24}>
      <Group justify="space-between" align="flex-start" gap="md">
        <Title order={1} fz={32}>
          Ficha
        </Title>
        <Group gap="sm">
          <VisibilityHelp />
          {profile && (
            <Button
              component={Link}
              to={`/organizations/${profile.slug}`}
              variant="outline"
              h={44}
              rightSection={<IconExternalLink size={18} aria-hidden />}
            >
              Ver ficha pública
            </Button>
          )}
        </Group>
      </Group>
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

const noop = () => undefined;

/** A button that opens what the visibility badges and toggles mean. */
function VisibilityHelp() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Button
        variant="default"
        h={44}
        leftSection={<IconEye size={18} aria-hidden />}
        onClick={open}
      >
        ¿Quién ve mis datos?
      </Button>
      <AppModal opened={opened} onClose={close} title="¿Quién ve mis datos?" size={620}>
        <Stack gap={0} className={styles.legendList}>
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
            {/* The real toggle as a sample, not a control: the text next to it says what it means. */}
            <span className={styles.legendSample} aria-hidden="true" inert>
              <VisibilityToggle field="ejemplo" value={Visibility.PUBLIC} onChange={noop} />
            </span>
            <Text size="sm" c="dimmed">
              Lo configurás vos: elegís si el dato es visible o no para visitantes externos.
            </Text>
          </div>
        </Stack>
      </AppModal>
    </>
  );
}

/** "2 de 3": how many of the data of a section are already there. */
function progress({ items }: SectionStatus): string {
  return `${String(items.filter(({ done }) => done).length)} de ${String(items.length)}`;
}

function Sections({ profile }: { profile: CooperativeOrganizationProfileResponse }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('section');
  const current: ProfileSectionKey = isProfileSection(requested) ? requested : 'identification';
  const { mutateAsync, isPending, variables } = useSaveProfileSection(profile.id);
  // The sections that have changes not saved yet. Each section is saved on its own, so leaving one with changes asks
  // first, and so does leaving the page or closing the tab.
  const [dirty, setDirty] = useState<ReadonlySet<ProfileSectionKey>>(new Set());
  const [leaving, setLeaving] = useState<ProfileSectionKey | null>(null);
  // A section starts over from the saved profile when its revision goes up.
  const [resets, setResets] = useState<Record<ProfileSectionKey, number>>({
    identification: 0,
    activity: 0,
    photos: 0,
    location: 0,
    contact: 0,
  });
  const hasUnsaved = dirty.size > 0;
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasUnsaved && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!hasUnsaved) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => {
      window.removeEventListener('beforeunload', warn);
    };
  }, [hasUnsaved]);

  const markDirty = useCallback((section: ProfileSectionKey, isDirty: boolean) => {
    setDirty((current) => {
      if (current.has(section) === isDirty) return current;
      const next = new Set(current);
      if (isDirty) next.add(section);
      else next.delete(section);
      return next;
    });
  }, []);

  function go(section: ProfileSectionKey) {
    setSearchParams({ section }, { replace: true });
  }

  /** Moves to another section, asking first when the current one has changes that are not saved. */
  function leave(section: ProfileSectionKey) {
    if (section !== current && dirty.has(current)) setLeaving(section);
    else go(section);
  }

  function discardAndGo(section: ProfileSectionKey) {
    setResets((counts) => ({ ...counts, [current]: counts[current] + 1 }));
    setLeaving(null);
    go(section);
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
          leave(following.key);
        },
      },
      save: mutateAsync,
      revision: resets[section],
      onDirtyChange: (isDirty) => {
        markDirty(section, isDirty);
      },
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
                leave(key);
              }}
            >
              <span className={styles.navText}>
                <span>{label}</span>
                {key === current ? (
                  <ul className={styles.items}>
                    {status.items.map((item) => (
                      <li key={item.label} className={item.done ? styles.done : styles.pending}>
                        {item.done ? (
                          <IconCircleCheck size={16} aria-hidden className={styles.itemDone} />
                        ) : (
                          <IconAlertCircle size={16} aria-hidden className={styles.itemMissing} />
                        )}
                        {item.label}
                        <span className={styles.srOnly}>
                          {item.done ? ': completo' : ': falta'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className={status.complete ? styles.done : styles.pending}>
                    {status.complete ? 'Completo' : progress(status)}
                  </span>
                )}
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
      <ConfirmDialog
        opened={blocker.state === 'blocked'}
        title="Tenés cambios sin guardar"
        icon={<IconAlertCircle aria-hidden />}
        confirmLabel="Salir sin guardar"
        onConfirm={() => {
          blocker.proceed?.();
        }}
        onClose={() => {
          blocker.reset?.();
        }}
      >
        Si salís de la ficha ahora, se pierden los cambios que todavía no guardaste.
      </ConfirmDialog>
      <ConfirmDialog
        opened={leaving !== null}
        title="Tenés cambios sin guardar"
        icon={<IconAlertCircle aria-hidden />}
        confirmLabel="Descartar cambios"
        onConfirm={() => {
          if (leaving) discardAndGo(leaving);
        }}
        onClose={() => {
          setLeaving(null);
        }}
      >
        Si cambiás de sección ahora, perderás los cambios que todavía no guardaste.
      </ConfirmDialog>
      <div className={styles.section}>
        <IdentificationSection {...props('identification')} />
        <ActivitySection {...props('activity')} />
        <PhotosSection {...props('photos')} />
        <LocationSection {...props('location')} />
        <ContactSection {...props('contact')} />
      </div>
    </div>
  );
}
