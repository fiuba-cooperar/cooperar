import { Badge, Group, Paper, Stack, Title } from '@mantine/core';
import {
  REGISTRATION_REQUEST_STATUS_LABELS,
  REGISTRATION_STATUS_COLORS,
} from '@/features/organizations/labels';
import { RegistrationStatusDetail, type Request } from './RegistrationStatusDetail';

/**
 * A request in short, for the home: where it stands in the observatory's review, and the way to correct it when the
 * observatory asked for changes.
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
          <Title order={3} fz={18} id={headingId}>
            {request.name}
          </Title>
          <Badge variant="light" color={REGISTRATION_STATUS_COLORS[request.status]}>
            {REGISTRATION_REQUEST_STATUS_LABELS[request.status]}
          </Badge>
        </Group>
        <RegistrationStatusDetail request={request} emailVerified={emailVerified} />
      </Stack>
    </Paper>
  );
}
