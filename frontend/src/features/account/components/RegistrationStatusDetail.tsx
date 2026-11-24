import { Button, Group, Stack, Text } from '@mantine/core';
import { IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router';
import { RegistrationStatus, type RegistrationRequestSummary } from '@/api/generated/model';
import { registrationRequestPath } from '../accountSections';
import styles from './RegistrationStatusDetail.module.css';

/** What the home (from the session) and the list of requests know about a request. */
export type Request = RegistrationRequestSummary & { organizationSlug?: string };

/** Where the request stands and what the account can do about it. */
export function RegistrationStatusDetail({
  request,
  emailVerified,
}: {
  request: Request;
  emailVerified: boolean;
}) {
  switch (request.status) {
    case RegistrationStatus.PENDING:
      return (
        <Text size="sm" c="dimmed">
          {emailVerified
            ? 'El observatorio está revisando la solicitud. Te avisaremos por email cuando la aprueben o si debes actualizar algún dato.'
            : 'Cuando confirmes tu email, el observatorio va a revisar la solicitud.'}
        </Text>
      );
    case RegistrationStatus.CHANGES_REQUESTED:
      return (
        <Stack gap="sm">
          {/* What was asked for is shown along with the form, where it gets corrected. */}
          <Text size="sm" c="dimmed">
            Para aprobar la solicitud, el observatorio necesita que revises algunos datos.
          </Text>
          <Group>
            <Button component={Link} to={registrationRequestPath(request.id)} size="sm" h={44}>
              Ver cambios solicitados y corregir
            </Button>
          </Group>
        </Stack>
      );
    case RegistrationStatus.REJECTED:
      return (
        <Stack gap={4}>
          <Text size="sm" c="dimmed">
            El observatorio no aprobó la solicitud por este motivo:
          </Text>
          <Text size="sm" className={styles.message}>
            {request.reviewMessage}
          </Text>
        </Stack>
      );
    case RegistrationStatus.APPROVED:
      // The status badge already says it was approved, so only the way to the public profile is left.
      return request.organizationSlug ? (
        <Group>
          <Button
            component={Link}
            to={`/organizations/${request.organizationSlug}`}
            variant="light"
            size="sm"
            h={44}
            rightSection={<IconExternalLink size={16} aria-hidden />}
          >
            Ver la ficha pública
          </Button>
        </Group>
      ) : null;
  }
}
