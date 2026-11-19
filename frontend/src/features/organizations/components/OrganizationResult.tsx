import { Avatar, Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconMapPin } from '@tabler/icons-react';
import { Link } from 'react-router';
import type { OrganizationSummaryResponse } from '@/api/generated/model';
import {
  ACTIVITY_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  PROVINCE_LABELS,
  SECTOR_LABELS,
} from '../labels';
import styles from './OrganizationResult.module.css';

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word))
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('');
}

/** An organization found in the public directory, with the way to its profile. */
export function OrganizationResult({
  organization,
}: {
  organization: OrganizationSummaryResponse;
}) {
  const headingId = `organization-${organization.slug}`;
  const profilePath = `/organizations/${organization.slug}`;
  return (
    <Paper
      component="article"
      withBorder
      radius={14}
      className={styles.result}
      aria-labelledby={headingId}
    >
      {/* TODO(#13): show the logo once photos can be stored. */}
      <Avatar size={72} radius={12} color="brand" aria-hidden className={styles.logo}>
        {initials(organization.name)}
      </Avatar>
      <Stack gap={8} className={styles.body}>
        <Group gap={8}>
          <Title order={3} fz={18} id={headingId}>
            <Link to={profilePath} className={styles.name}>
              {organization.name}
            </Link>
          </Title>
          <Badge variant="light">{ORGANIZATION_TYPE_LABELS[organization.type]}</Badge>
        </Group>
        <Group gap="6px 14px" fz={14} c="dimmed">
          <Group gap={6} wrap="nowrap" component="span">
            <IconMapPin size={16} stroke={2} aria-hidden />
            {`${organization.locality}, ${organization.district}, ${PROVINCE_LABELS[organization.province]}`}
          </Group>
          <span>{organization.sectors.map((sector) => SECTOR_LABELS[sector]).join(', ')}</span>
          <span>
            {organization.activityTypes.map((type) => ACTIVITY_TYPE_LABELS[type]).join(' · ')}
          </span>
        </Group>
        {organization.description && (
          <Text fz={15} lh={1.55} lineClamp={2}>
            {organization.description}
          </Text>
        )}
      </Stack>
      <Button
        component={Link}
        to={profilePath}
        variant="outline"
        h={44}
        className={styles.action}
        aria-label={`Ver la ficha de ${organization.name}`}
      >
        Ver ficha
      </Button>
    </Paper>
  );
}
