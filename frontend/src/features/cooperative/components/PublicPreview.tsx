import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router';
import { OrganizationStatus, type OrganizationSummary } from '@/api/generated/model';
import { useOrganizationProfile } from '@/features/organizations/api/useOrganizationProfile';
import { PROVINCE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import styles from './PublicPreview.module.css';

function PublicDetails({ slug }: { slug: string }) {
  const { data: profile } = useOrganizationProfile(slug);
  if (!profile) return null;

  return (
    <Group gap={8} className={styles.details}>
      <Badge variant="light" tt="none" fz={12} fw={600}>
        {SECTOR_LABELS[profile.sector]}
      </Badge>
      <Text size="sm" c="dimmed">
        {profile.locality}, {PROVINCE_LABELS[profile.province]}
      </Text>
    </Group>
  );
}

/** Summary of how the organization looks in the public profile, with the link to it once approved. */
export function PublicPreview({ organization }: { organization: OrganizationSummary }) {
  const approved = organization.status === OrganizationStatus.APPROVED;

  return (
    <Paper
      component="aside"
      withBorder
      radius={14}
      p={20}
      aria-labelledby="preview"
      className={styles.preview}
    >
      <Stack gap={14}>
        <Title order={2} id="preview" fz={16} style={{ letterSpacing: 'normal' }}>
          Así te ve el público
        </Title>
        {/* TODO(#16): show the cover photo once profiles have photos. */}
        <div className={styles.cover} aria-hidden>
          Foto de portada
        </div>
        <Stack gap={6}>
          <Text fw={700} fz={17}>
            {organization.name}
          </Text>
          {approved && <PublicDetails slug={organization.slug} />}
        </Stack>
        {approved ? (
          <Button
            component={Link}
            to={`/organizations/${organization.slug}`}
            variant="light"
            fullWidth
            rightSection={<IconExternalLink size={18} aria-hidden />}
          >
            Ver mi ficha pública
          </Button>
        ) : (
          <Text size="sm" c="dimmed">
            Todavía no es visible en el sitio público.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
