import {
  Alert,
  Anchor,
  Button,
  Paper,
  PasswordInput,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useId, useState, type SyntheticEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { hasErrors, type FormErrors } from '@/features/organizations/registrationForm';
import { NEW_REGISTRATION_REQUEST_PATH } from '@/features/account/accountSections';
import { Role } from '@/api/generated/model';
import { RegistrationError, useRegistration } from './api/useRegistration';
import styles from './RegisterPage.module.css';
import { ROLE_HOME } from './roleHome';
import { useAuth } from './useAuth';

interface AccountForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

// BCrypt on the backend only takes 72 bytes, which can be fewer than 72 characters.
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_LENGTH = 8;
// 560px of content, as in the mock, plus the 36px padding and the border.
const CARD_WIDTH = 560 + 2 * 36 + 2;

const EMPTY_ACCOUNT: AccountForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};

const EMAIL_HINT =
  'Es tu usuario para ingresar. Con esta cuenta vas a poder dar de alta y administrar una o más entidades.';
const PASSWORD_HINT = `Usá al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
const EMAIL_TAKEN = 'Ya hay una cuenta con este email. Si es tuya, ingresá desde el login.';
const FORM_ERRORS: Record<RegistrationError['reason'], string> = {
  conflict: 'Algunos datos ya están registrados. Revisalos e intentá de nuevo.',
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  unavailable:
    'No pudimos completar el registro por un problema de conexión. Intentá de nuevo en unos minutos.',
};

function validateAccount(form: AccountForm): FormErrors<AccountForm> {
  const errors: FormErrors<AccountForm> = {};
  if (!form.firstName.trim()) errors.firstName = 'Ingresá tu nombre.';
  if (!form.lastName.trim()) errors.lastName = 'Ingresá tu apellido.';
  if (!form.email.trim()) errors.email = 'Ingresá tu email.';
  else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
    errors.email = 'Revisá el email: tiene que ser como tu@email.com.';
  if (form.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `La contraseña tiene que tener al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
  else if (new TextEncoder().encode(form.password).length > MAX_PASSWORD_BYTES)
    errors.password = 'La contraseña es demasiado larga.';
  if (form.passwordConfirmation !== form.password)
    errors.passwordConfirmation = 'Las contraseñas no coinciden.';
  return errors;
}

export function RegisterPage() {
  const { user, login } = useAuth();
  const registration = useRegistration();
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [accountErrors, setAccountErrors] = useState<FormErrors<AccountForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  // The page signs the new account in on success, so only redirect people who arrived already signed in.
  if (user && !created) return <Navigate to={ROLE_HOME[user.role]} replace />;

  function updateAccount(field: keyof AccountForm, value: string) {
    setAccount((current) => ({ ...current, [field]: value }));
    setAccountErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAccount(account);
    setAccountErrors(errors);
    if (hasErrors(errors)) return;

    setFormError(null);
    try {
      await registration.mutateAsync({
        firstName: account.firstName.trim(),
        lastName: account.lastName.trim(),
        email: account.email.trim(),
        password: account.password,
      });
    } catch (caught) {
      const error =
        caught instanceof RegistrationError ? caught : new RegistrationError('unavailable');
      if (error.conflicts.includes('EMAIL')) setAccountErrors({ email: EMAIL_TAKEN });
      else setFormError(FORM_ERRORS[error.reason]);
      return;
    }
    setCreated(true);
    // If signing in fails, the panel links still work: they send the person to the login.
    await login(account.email, account.password).catch(() => undefined);
  }

  if (created) {
    return (
      <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={CARD_WIDTH} mx="auto" w="100%">
        <Stack align="center" ta="center" gap="md" py={8}>
          <ThemeIcon variant="transparent" size={56} aria-hidden="true">
            <IconCircleCheck size={56} stroke={1.6} />
          </ThemeIcon>
          <Title order={1} fz={28} className={styles.heading}>
            ¡Listo! Ya tenés tu cuenta
          </Title>
          <Text c="dimmed" fz={16}>
            Te enviamos un email a <strong>{account.email.trim()}</strong> para que confirmes tu
            cuenta. Cuando lo confirmes, podés dar de alta tu entidad: el observatorio la va a
            revisar y te vamos a avisar por email.
          </Text>
          <Button component={Link} to={NEW_REGISTRATION_REQUEST_PATH} h={48} mt="xs">
            Dar de alta mi entidad
          </Button>
          <Anchor component={Link} to={ROLE_HOME[Role.COOPERATIVE]} fw={600}>
            Ir a mi panel
          </Anchor>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={CARD_WIDTH} mx="auto" w="100%">
      <Stack gap={22}>
        <Title order={1} fz={28} className={styles.heading}>
          Creá tu cuenta
        </Title>
        <Text c="dimmed" fz={15}>
          Registrate para comenzar. Una vez que hayas iniciado sesión, podrás dar de alta tu
          entidad.{' '}
          <Anchor component={Link} to="/login" fw={600} inherit>
            ¿Ya tenés una cuenta? Ingresá
          </Anchor>
        </Text>
        <form onSubmit={(event) => void handleSubmit(event)} noValidate>
          <Stack gap={22}>
            {formError && (
              <Alert
                className={styles.alert}
                icon={<IconAlertCircle aria-hidden="true" />}
                role="alert"
              >
                {formError}
              </Alert>
            )}
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                <TextInput
                  label="Nombre"
                  autoComplete="given-name"
                  maxLength={100}
                  value={account.firstName}
                  error={accountErrors.firstName}
                  onChange={(event) => {
                    updateAccount('firstName', event.currentTarget.value);
                  }}
                />
                <TextInput
                  label="Apellido"
                  autoComplete="family-name"
                  maxLength={100}
                  value={account.lastName}
                  error={accountErrors.lastName}
                  onChange={(event) => {
                    updateAccount('lastName', event.currentTarget.value);
                  }}
                />
              </SimpleGrid>
              <div>
                <LabelWithHint htmlFor={emailId} label="Email" hint={EMAIL_HINT} />
                <TextInput
                  id={emailId}
                  aria-description={EMAIL_HINT}
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="username"
                  maxLength={254}
                  value={account.email}
                  error={accountErrors.email}
                  onChange={(event) => {
                    updateAccount('email', event.currentTarget.value);
                  }}
                />
              </div>
              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                <div>
                  <LabelWithHint htmlFor={passwordId} label="Contraseña" hint={PASSWORD_HINT} />
                  <PasswordInput
                    id={passwordId}
                    aria-description={PASSWORD_HINT}
                    autoComplete="new-password"
                    value={account.password}
                    error={accountErrors.password}
                    onChange={(event) => {
                      updateAccount('password', event.currentTarget.value);
                    }}
                  />
                </div>
                <PasswordInput
                  label="Repetí la contraseña"
                  autoComplete="new-password"
                  value={account.passwordConfirmation}
                  error={accountErrors.passwordConfirmation}
                  onChange={(event) => {
                    updateAccount('passwordConfirmation', event.currentTarget.value);
                  }}
                />
              </SimpleGrid>
            </Stack>
            <Button
              type="submit"
              h={48}
              fz={16}
              loading={registration.isPending}
              loaderProps={{ type: 'dots' }}
            >
              Crear cuenta
            </Button>
          </Stack>
        </form>
      </Stack>
    </Paper>
  );
}
