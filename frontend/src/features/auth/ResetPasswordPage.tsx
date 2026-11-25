import { Alert, Button, PasswordInput, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState, type SyntheticEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import {
  PasswordResetError,
  usePasswordResetAccount,
  useResetPassword,
} from './api/usePasswordReset';
import { AuthCard, AuthOutcome } from './AuthCard';
import { FORGOT_PASSWORD_PATH, type LoginState } from './passwordResetPaths';
import { PASSWORD_HINT, passwordErrors } from './passwordRules';
import styles from './LoginPage.module.css';

function InvalidLink() {
  return (
    <AuthOutcome
      icon={<IconAlertCircle size={56} stroke={1.6} />}
      color="red"
      title="Este enlace ya no sirve"
    >
      <Text c="dimmed">Venció o ya se usó. Pedí uno nuevo y te lo mandamos al momento.</Text>
      <Button component={Link} to={FORGOT_PASSWORD_PATH} h={48}>
        Pedir otro enlace
      </Button>
    </AuthOutcome>
  );
}

/** Landing page of the emailed link: «Elegí tu contraseña nueva», for the account the link is for. */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const account = usePasswordResetAccount(token);
  const reset = useResetPassword();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof passwordErrors>>({});

  const failure = reset.error instanceof PasswordResetError ? reset.error.reason : null;
  if (!token || account.data === null || failure === 'invalid-link') return <InvalidLink />;
  if (account.isPending) return <Text role="status">Revisando el enlace…</Text>;
  if (account.isError) {
    return (
      <AuthCard title="No pudimos abrir el enlace">
        <Text c="dimmed" ta="center">
          Hubo un problema de conexión. Volvé a abrir el enlace del email en unos minutos.
        </Text>
      </AuthCard>
    );
  }
  const email = account.data;

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = passwordErrors(password, confirmation);
    setErrors(found);
    if (found.password || found.passwordConfirmation) return;
    reset.mutate(
      { token, password },
      {
        onSuccess: () => {
          const state: LoginState = { email, passwordChanged: true };
          void navigate('/login', { replace: true, state });
        },
      },
    );
  }

  return (
    <AuthCard title="Elegí tu contraseña nueva" description={`Para la cuenta ${email}.`}>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          {failure === 'unavailable' && (
            <Alert
              className={styles.alert}
              icon={<IconAlertCircle aria-hidden="true" />}
              role="alert"
            >
              No pudimos guardar la contraseña por un problema de conexión. Intentá de nuevo en unos
              minutos.
            </Alert>
          )}
          {/* Lets password managers save the new password under the right account. */}
          <input type="email" value={email} autoComplete="username" readOnly hidden />
          <div>
            <LabelWithHint htmlFor="new-password" label="Contraseña nueva" hint={PASSWORD_HINT} />
            <PasswordInput
              id="new-password"
              aria-description={PASSWORD_HINT}
              autoComplete="new-password"
              value={password}
              error={errors.password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
              }}
            />
          </div>
          <PasswordInput
            label="Repetí la contraseña"
            autoComplete="new-password"
            value={confirmation}
            error={errors.passwordConfirmation}
            onChange={(event) => {
              setConfirmation(event.currentTarget.value);
            }}
          />
          <Button
            type="submit"
            size="lg"
            fz={16}
            loading={reset.isPending}
            loaderProps={{ type: 'dots' }}
          >
            Guardar la contraseña
          </Button>
        </Stack>
      </form>
    </AuthCard>
  );
}
