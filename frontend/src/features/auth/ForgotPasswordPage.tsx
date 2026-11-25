import { Alert, Anchor, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconMailForward } from '@tabler/icons-react';
import { useState, type SyntheticEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { PasswordResetError, useRequestPasswordReset } from './api/usePasswordReset';
import { AuthCard, AuthOutcome } from './AuthCard';
import type { LoginState } from './passwordResetPaths';
import styles from './LoginPage.module.css';

const ERROR_MESSAGES: Record<PasswordResetError['reason'], string> = {
  'invalid-link': 'No pudimos mandar el enlace. Intentá de nuevo en unos minutos.',
  'rate-limited':
    'Ya pediste varios enlaces en poco tiempo. Revisá tu email o intentá de nuevo en una hora.',
  unavailable:
    'No pudimos mandar el enlace por un problema de conexión. Intentá de nuevo en unos minutos.',
};

function BackToLogin({ email }: { email: string }) {
  const state: LoginState = { email };
  return (
    <Anchor component={Link} to="/login" state={state} fz={14} fw={600}>
      <Group gap={4} component="span">
        <IconArrowLeft size={16} aria-hidden />
        Volver al login
      </Group>
    </Anchor>
  );
}

/** «Recuperá tu contraseña»: asks for the email, and says the same whether it has an account or not. */
export function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState((location.state as LoginState | null)?.email ?? '');
  const [missing, setMissing] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const request = useRequestPasswordReset();
  const error = request.error instanceof PasswordResetError ? request.error.reason : null;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setMissing(true);
      return;
    }
    setMissing(false);
    request.mutate(trimmed, {
      onSuccess: () => {
        setSentTo(trimmed);
      },
    });
  }

  if (sentTo) {
    return (
      <AuthOutcome
        icon={<IconMailForward size={56} stroke={1.6} />}
        color="brand"
        title="Revisá tu email"
      >
        <Text c="dimmed">
          Si hay una cuenta con <b>{sentTo}</b>, te llega un enlace para elegir una contraseña
          nueva. Vence en 1 hora.
        </Text>
        <Text c="dimmed" fz={14}>
          ¿No te llegó? Revisá la carpeta de spam o{' '}
          <Anchor
            component="button"
            type="button"
            fz={14}
            onClick={() => {
              request.reset();
              setSentTo(null);
            }}
          >
            pedí otro enlace
          </Anchor>
          .
        </Text>
        <BackToLogin email={sentTo} />
      </AuthOutcome>
    );
  }

  return (
    <AuthCard
      title="Recuperá tu contraseña"
      description="Ingresá el email de tu cuenta y te mandamos un enlace para elegir una contraseña nueva."
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          {error && (
            <Alert
              className={styles.alert}
              icon={<IconAlertCircle aria-hidden="true" />}
              id="forgot-error"
              role="alert"
            >
              {ERROR_MESSAGES[error]}
            </Alert>
          )}
          <TextInput
            label="Email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="username"
            required
            withAsterisk={false}
            value={email}
            error={missing ? 'Ingresá tu email: tiene que ser como tu@email.com.' : undefined}
            aria-describedby={error ? 'forgot-error' : undefined}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
            }}
          />
          <Button
            type="submit"
            size="lg"
            fz={16}
            loading={request.isPending}
            loaderProps={{ type: 'dots' }}
          >
            Mandame el enlace
          </Button>
          <Group justify="center">
            <BackToLogin email={email.trim()} />
          </Group>
        </Stack>
      </form>
    </AuthCard>
  );
}
