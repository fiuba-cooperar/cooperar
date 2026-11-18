import { Paper, Stack, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useCreateRegistrationRequest } from './api/useRegistrationRequest';
import { RegistrationRequestForm } from './components/RegistrationRequestForm';
import { RequestSent } from './components/RequestSent';
import { COOPERATIVE_REGISTRATION_REQUESTS_PATH } from './cooperativeSections';

const FORM_ERRORS = {
  // A new request is never waiting for changes, so a conflict without the CUIT is unexpected.
  'not-requested': 'No pudimos enviar la solicitud. Intentá de nuevo en unos minutos.',
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  unavailable:
    'No pudimos enviar la solicitud por un problema de conexión. Intentá de nuevo en unos minutos.',
};

/** Where the account asks the observatory to add another cooperative or ERT. */
export function NewRegistrationRequestPage() {
  const { user, refreshUser } = useAuth();
  const creation = useCreateRegistrationRequest();
  const [sent, setSent] = useState(false);

  return (
    <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={720} w="100%">
      <Stack gap="lg">
        <Stack gap={6}>
          <Title order={1} fz={28}>
            Nueva solicitud de alta
          </Title>
          <Text c="dimmed">
            Contanos qué entidad querés sumar. El observatorio va a revisar la solicitud y, cuando
            la apruebe, vas a poder administrarla desde tu panel.
          </Text>
        </Stack>
        {sent ? (
          <RequestSent title="Enviaste la solicitud">
            {user?.emailVerified
              ? 'El observatorio la va a revisar y te vamos a avisar por email cuando termine.'
              : 'Cuando confirmes tu email, el observatorio la va a revisar y te vamos a avisar por email.'}
          </RequestSent>
        ) : (
          <RegistrationRequestForm
            submitLabel="Enviar la solicitud"
            cancelPath={COOPERATIVE_REGISTRATION_REQUESTS_PATH}
            submitting={creation.isPending}
            formErrors={FORM_ERRORS}
            onSubmit={async (body) => {
              await creation.mutateAsync(body);
              setSent(true);
              // The home lists the requests from the session.
              await refreshUser();
            }}
          />
        )}
      </Stack>
    </Paper>
  );
}
