import { Button, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Role } from '@/api/generated/model';
import { EmailVerificationError, useVerifyEmail } from './api/useEmailVerification';
import { ROLE_HOME } from './roleHome';
import { useAuth } from './useAuth';

export const VERIFY_EMAIL_PATH = '/verify-email';

function Outcome({
  title,
  children,
  success = false,
}: {
  title: string;
  children: string;
  success?: boolean;
}) {
  const Icon = success ? IconCircleCheck : IconAlertCircle;
  return (
    <Stack align="center" ta="center" gap="md">
      <ThemeIcon variant="transparent" size={56} color={success ? 'brand' : 'red'} aria-hidden>
        <Icon size={56} stroke={1.6} />
      </ThemeIcon>
      <Title order={1} fz={28}>
        {title}
      </Title>
      <Text c="dimmed" fz={16}>
        {children}
      </Text>
      <Button component={Link} to={ROLE_HOME[Role.COOPERATIVE]} h={48}>
        Ir a mi panel
      </Button>
    </Stack>
  );
}

/** Landing page of the link emailed after signing up: confirms the account's email with the token in the URL. */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { refreshUser } = useAuth();
  const { mutate, status, error } = useVerifyEmail();
  const requested = useRef(false);

  useEffect(() => {
    // Each token works only once, so the request must not repeat when React runs the effect twice.
    if (!token || requested.current) return;
    requested.current = true;
    mutate(token, { onSuccess: () => void refreshUser() });
  }, [token, mutate, refreshUser]);

  const invalidLink =
    !token || (error instanceof EmailVerificationError && error.reason === 'invalid-link');

  return (
    <Paper withBorder radius="lg" p={{ base: 24, xs: 36 }} maw={560} mx="auto" w="100%">
      {invalidLink ? (
        <Outcome title="El enlace no es válido">
          Puede que ya lo hayas usado o que haya vencido. Ingresá a tu panel y pedí un enlace nuevo.
        </Outcome>
      ) : status === 'success' ? (
        <Outcome title="¡Confirmaste tu email!" success>
          Ahora el observatorio va a revisar el alta de tu organización. Te vamos a avisar por email
          cuando esté lista.
        </Outcome>
      ) : status === 'error' ? (
        <Outcome title="No pudimos confirmar tu email">
          Hubo un problema de conexión. Volvé a abrir el enlace del email en unos minutos.
        </Outcome>
      ) : (
        <Text role="status" ta="center">
          Confirmando tu email…
        </Text>
      )}
    </Paper>
  );
}
