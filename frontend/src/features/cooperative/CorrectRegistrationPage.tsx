import { Alert, Button, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { RegistrationStatus } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { useRegistrationRequest, useResubmitRegistration } from './api/useRegistrationRequest';
import { RegistrationRequestForm } from './components/RegistrationRequestForm';
import { RequestSent } from './components/RequestSent';
import { COOPERATIVE_REGISTRATION_REQUESTS_PATH } from './cooperativeSections';
import styles from './CorrectRegistrationPage.module.css';

const FORM_ERRORS = {
  'not-requested':
    'El observatorio ya no está esperando cambios en esta solicitud. Volvé a tus solicitudes para ver su estado.',
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  unavailable:
    'No pudimos reenviar la solicitud por un problema de conexión. Intentá de nuevo en unos minutos.',
};

function RegistrationCorrection({ requestId }: { requestId: string }) {
  const { refreshUser } = useAuth();
  const registration = useRegistrationRequest(requestId);
  const resubmission = useResubmitRegistration();
  // Kept here: once sent, the request is pending again and would otherwise read as "no changes asked for".
  const [resubmitted, setResubmitted] = useState(false);

  if (resubmitted) {
    return (
      <RequestSent title="Reenviaste la solicitud">
        El observatorio va a revisar los datos corregidos y te vamos a avisar por email cuando
        termine.
      </RequestSent>
    );
  }
  if (registration.isPending) return <Text role="status">Cargando la solicitud…</Text>;
  if (registration.isError) {
    return (
      <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
        No pudimos cargar la solicitud. Intentá de nuevo en unos minutos.
      </Alert>
    );
  }
  const { data } = registration;
  if (data.status !== RegistrationStatus.CHANGES_REQUESTED) {
    return (
      <Stack gap="md" align="flex-start">
        <Text>
          El observatorio no pidió cambios en la solicitud de {data.name}. Podés ver sus datos en
          tus solicitudes.
        </Text>
        <Button
          component={Link}
          to={COOPERATIVE_REGISTRATION_REQUESTS_PATH}
          variant="default"
          h={44}
        >
          Ver mis solicitudes
        </Button>
      </Stack>
    );
  }
  return (
    <Stack gap="lg">
      <Alert
        // An info box, not an error: Mantine's default role would announce it as one.
        role="note"
        variant="light"
        color="orange"
        icon={<IconInfoCircle aria-hidden />}
        title="Lo que pidió el observatorio"
      >
        <Text size="sm" className={styles.message}>
          {data.reviewMessage}
        </Text>
      </Alert>
      <RegistrationRequestForm
        initial={data}
        submitLabel="Reenviar la solicitud"
        cancelPath={COOPERATIVE_REGISTRATION_REQUESTS_PATH}
        submitting={resubmission.isPending}
        formErrors={FORM_ERRORS}
        onSubmit={async (body) => {
          await resubmission.mutateAsync({ id: data.id, data: body });
          setResubmitted(true);
          // The home shows the status from the session, which still says the changes are pending.
          await refreshUser();
        }}
      />
    </Stack>
  );
}

/**
 * Where the account corrects a registration request when the observatory asks for more information; it is the only
 * time the account can change it. The data of the request, in any status, is in the list of requests.
 */
export function CorrectRegistrationPage() {
  const { id = '' } = useParams();

  return (
    <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={720} w="100%">
      <Stack gap="lg">
        <Stack gap={6}>
          <Title order={1} fz={28}>
            Corregir la solicitud
          </Title>
          <Text c="dimmed">
            Revisá los datos de la entidad y reenviá la solicitud para que el observatorio la vuelva
            a revisar.
          </Text>
        </Stack>
        {/* Keyed so that moving to another request starts over. */}
        <RegistrationCorrection key={id} requestId={id} />
      </Stack>
    </Paper>
  );
}
