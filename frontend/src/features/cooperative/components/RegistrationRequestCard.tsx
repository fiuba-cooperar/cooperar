import { Anchor, Badge, Group, Paper, Stack, Title } from '@mantine/core';
import { Link } from 'react-router';
import { RegistrationStatus } from '@/api/generated/model';
import {
  REGISTRATION_REQUEST_STATUS_LABELS,
  REGISTRATION_STATUS_COLORS,
} from '@/features/organizations/labels';
import { COOPERATIVE_REGISTRATION_REQUESTS_PATH } from '../cooperativeSections';
import { RegistrationStatusDetail, type Request } from './RegistrationStatusDetail';

/**
 * A request in short, for the home: where it stands in the observatory's review, and the way to its data (or to
 * correct them, when the observatory asked for changes).
 */
export function RegistrationRequestCard({
  request,
  emailVerified,
}: {
  request: Request;
  emailVerified: boolean;
}) {
  const headingId = `request-${request.id}`;
  return (
    <Paper component="article" withBorder radius="md" p="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Group justify="space-between" gap="xs">
          <Title order={2} fz={18} id={headingId}>
            {request.name}
          </Title>
          <Badge variant="light" color={REGISTRATION_STATUS_COLORS[request.status]}>
            {REGISTRATION_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </Group>
        <RegistrationStatusDetail request={request} emailVerified={emailVerified} />
        {request.status !== RegistrationStatus.CHANGES_REQUESTED && (
          <Anchor component={Link} to={COOPERATIVE_REGISTRATION_REQUESTS_PATH} size="sm">
            Ver los datos en mis solicitudes
          </Anchor>
        )}
      </Stack>
    </Paper>
  );
}
