import { Button, Group, Paper, Progress, Stack, Text, Title } from '@mantine/core';
import { IconCircleCheck, IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { OrganizationSummary } from '@/api/generated/model';
import { useManagedProfile } from '../api/useManagedProfile';
import { cooperativePanel } from '../cooperativeSections';
import { PROFILE_SECTIONS, sectionStatus } from './profile/profileStatus';
import styles from './ProfileStatus.module.css';

/** How complete the profile is, what is missing in each section (with a link to it), and the link to the public one. */
export function ProfileStatus({ organization }: { organization: OrganizationSummary }) {
  const profilePath = cooperativePanel(organization.slug).profile;
  const { data: profile } = useManagedProfile(organization.id);
  const sections = profile
    ? PROFILE_SECTIONS.map(({ key, label }) => ({ key, label, ...sectionStatus(profile, key) }))
    : [];
  const items = sections.flatMap(({ items: sectionItems }) => sectionItems);
  const loaded = items.filter(({ done }) => done).length;
  const percent = items.length > 0 ? Math.round((loaded / items.length) * 100) : 0;
  const pending = sections.filter(({ complete }) => !complete);

  return (
    <Paper
      component="aside"
      withBorder
      radius={14}
      p={20}
      aria-labelledby="profile-status"
      className={styles.status}
    >
      <Stack gap={14}>
        <Title order={2} id="profile-status" fz={16} style={{ letterSpacing: 'normal' }}>
          Estado de tu ficha
        </Title>
        {profile && (
          <>
            <Stack gap={6}>
              <Text fw={700} fz={22}>
                {percent} % de datos cargados
              </Text>
              <Progress value={percent} aria-label="Datos cargados en tu ficha" />
            </Stack>
            {pending.length === 0 ? (
              <Group gap={8} wrap="nowrap" c="green.8">
                <IconCircleCheck size={20} aria-hidden />
                <Text size="sm">Tu ficha tiene todos los datos.</Text>
              </Group>
            ) : (
              <Stack component="ul" gap={8} className={styles.missing}>
                {pending.map(({ key, label, items: sectionItems }) => (
                  <li key={key}>
                    <Link to={`${profilePath}?section=${key}`} className={styles.link}>
                      <span className={styles.linkTitle}>{label}</span>
                      <span className={styles.linkMissing}>
                        Podés sumar:{' '}
                        {sectionItems
                          .filter(({ done }) => !done)
                          .map((item) => item.label.toLowerCase())
                          .join(', ')}
                      </span>
                    </Link>
                  </li>
                ))}
              </Stack>
            )}
          </>
        )}
        <Button
          component={Link}
          to={`/organizations/${organization.slug}`}
          variant="light"
          fullWidth
          rightSection={<IconExternalLink size={18} aria-hidden />}
        >
          Ver ficha pública
        </Button>
      </Stack>
    </Paper>
  );
}
