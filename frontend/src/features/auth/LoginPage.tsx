import {
  Alert,
  Anchor,
  Button,
  Image,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useState, type SyntheticEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { REGISTER_PATH } from '@/components/layout/publicSections';
import { LoginError } from './authContext';
import styles from './LoginPage.module.css';
import { FORGOT_PASSWORD_PATH, type LoginState } from './passwordResetPaths';
import { ROLE_HOME } from './roleHome';
import { useAuth } from './useAuth';

const ERROR_MESSAGES: Record<LoginError['reason'], string> = {
  'invalid-credentials': 'El email o la contraseña no son correctos. Revisalos e intentá de nuevo.',
  'rate-limited':
    'Se alcanzó el límite de intentos de ingreso. Podrá intentarse nuevamente más tarde.',
  unavailable:
    'No pudimos iniciar sesión por un problema de conexión. Intentá de nuevo en unos minutos.',
};

const MISSING_FIELDS_MESSAGE = 'Ingresá tu email y tu contraseña.';

export function LoginPage() {
  const { status, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const loginState = location.state as LoginState | null;
  const [email, setEmail] = useState(loginState?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={ROLE_HOME[user.role]} replace />;

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError(MISSING_FIELDS_MESSAGE);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const account = await login(email, password);
      await navigate(ROLE_HOME[account.role], { replace: true });
    } catch (caught) {
      const reason = caught instanceof LoginError ? caught.reason : 'unavailable';
      setError(ERROR_MESSAGES[reason]);
      setSubmitting(false);
    }
  }

  return (
    <Paper withBorder radius="lg" p="xl" maw={486} mx="auto" w="100%">
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Stack gap="md">
          <Stack gap={6} align="center" ta="center">
            <Image src="/brand/logo-transparent.png" alt="cooperAR" w={180} h="auto" mb="xs" />
            <Title order={1} size="h2">
              Ingresá a tu cuenta
            </Title>
            <Text c="dimmed" fz={15}>
              Entrá con tu email y tu contraseña.
            </Text>
          </Stack>
          {loginState?.passwordChanged && !error && (
            <Alert color="brand" icon={<IconCircleCheck aria-hidden="true" />} role="status">
              Listo, ya podés ingresar con tu contraseña nueva.
            </Alert>
          )}
          {error && (
            <Alert
              className={styles.alert}
              icon={<IconAlertCircle aria-hidden="true" />}
              id="login-error"
              role="alert"
            >
              {error}
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
            aria-describedby={error ? 'login-error' : undefined}
            onChange={(event) => {
              setEmail(event.currentTarget.value);
            }}
          />
          <div className={styles.passwordField}>
            <PasswordInput
              label="Contraseña"
              classNames={{ section: styles.visibilityToggle }}
              placeholder="Tu contraseña"
              autoComplete="current-password"
              required
              withAsterisk={false}
              value={password}
              aria-describedby={error ? 'login-error' : undefined}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
              }}
            />
            {/* Sits next to the label, as in the mock, and takes the email already typed along. */}
            <Anchor
              component={Link}
              to={FORGOT_PASSWORD_PATH}
              state={{ email: email.trim() } satisfies LoginState}
              className={styles.forgot}
            >
              ¿Olvidaste tu contraseña?
            </Anchor>
          </div>
          <Button
            type="submit"
            size="lg"
            fz={16}
            loading={submitting}
            disabled={status === 'loading'}
            loaderProps={{ type: 'dots' }}
          >
            Ingresar
          </Button>
          <Text ta="center" fz={15}>
            ¿No tenés cuenta?{' '}
            <Anchor component={Link} to={REGISTER_PATH} fw={600} inherit>
              Registrate
            </Anchor>
          </Text>
        </Stack>
      </form>
    </Paper>
  );
}
