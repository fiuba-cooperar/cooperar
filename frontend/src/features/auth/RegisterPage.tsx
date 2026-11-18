import {
  Alert,
  Anchor,
  Group,
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
import { useEffect, useId, useRef, useState, type SyntheticEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { Role } from '@/api/generated/model';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { OrganizationRegistrationFields } from '@/features/organizations/components/OrganizationRegistrationFields';
import {
  CUIT_TAKEN,
  EMPTY_ORGANIZATION,
  hasErrors,
  toRegistrationRequest,
  validateOrganization,
  type FormErrors,
  type OrganizationForm,
} from '@/features/organizations/registrationForm';
import { RegistrationError, useRegistration } from './api/useRegistration';
import styles from './RegisterPage.module.css';
import { ROLE_HOME } from './roleHome';
import { useAuth } from './useAuth';

type Step = 'account' | 'organization' | 'done';

interface AccountForm {
  firstName: string;
  lastName: string;
  registrantRole: string;
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
  registrantRole: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};

const EMAIL_HINT =
  'Es tu usuario para ingresar. Con esta cuenta vas a poder administrar una o más entidades.';
const PASSWORD_HINT = `Usá al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
const EMAIL_TAKEN =
  'Ya hay una cuenta con este email. Si es tuya, ingresá y agregá la entidad desde tu panel.';
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
  if (!form.registrantRole.trim()) errors.registrantRole = 'Ingresá tu rol en la entidad.';
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
  const [step, setStep] = useState<Step>('account');
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);
  const [accountErrors, setAccountErrors] = useState<FormErrors<AccountForm>>({});
  const [organizationErrors, setOrganizationErrors] = useState<FormErrors<OrganizationForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isFirstRender = useRef(true);
  const emailId = useId();
  const passwordId = useId();

  // Each step swaps the whole form, so focus moves to its heading for keyboard and screen reader users.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  // The page signs the new account in on success, so only redirect people who arrived already signed in.
  if (user && step !== 'done') return <Navigate to={ROLE_HOME[user.role]} replace />;

  function updateAccount(field: keyof AccountForm, value: string) {
    setAccount((current) => ({ ...current, [field]: value }));
    setAccountErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateOrganization<K extends keyof OrganizationForm>(
    field: K,
    value: OrganizationForm[K],
  ) {
    setOrganization((current) => ({ ...current, [field]: value }));
    setOrganizationErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleAccountSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAccount(account);
    setAccountErrors(errors);
    if (!hasErrors(errors)) setStep('organization');
  }

  async function handleOrganizationSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateOrganization(organization);
    setOrganizationErrors(errors);
    const body = toRegistrationRequest(organization, account.registrantRole);
    if (hasErrors(errors) || !body) return;

    setFormError(null);
    try {
      await registration.mutateAsync({
        account: {
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          email: account.email.trim(),
          password: account.password,
        },
        organization: body,
      });
    } catch (caught) {
      showRegistrationError(
        caught instanceof RegistrationError ? caught : new RegistrationError('unavailable'),
      );
      return;
    }
    setStep('done');
    // If signing in fails, the panel link still works: it sends the person to the login.
    await login(account.email, account.password).catch(() => undefined);
  }

  function showRegistrationError(error: RegistrationError) {
    const emailTaken = error.conflicts.includes('EMAIL');
    const cuitTaken = error.conflicts.includes('CUIT');
    if (cuitTaken) setOrganizationErrors((current) => ({ ...current, cuit: CUIT_TAKEN }));
    if (emailTaken) {
      setAccountErrors({ email: EMAIL_TAKEN });
      setStep('account');
    }
    if (!emailTaken && !cuitTaken) setFormError(FORM_ERRORS[error.reason]);
  }

  if (step === 'done') {
    return (
      <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={CARD_WIDTH} mx="auto" w="100%">
        <Stack align="center" ta="center" gap="md" py={8}>
          <ThemeIcon variant="transparent" size={56} aria-hidden="true">
            <IconCircleCheck size={56} stroke={1.6} />
          </ThemeIcon>
          <Title order={1} fz={28} ref={headingRef} tabIndex={-1} className={styles.heading}>
            ¡Listo! Ya tenés tu cuenta
          </Title>
          <Text c="dimmed" fz={16}>
            Te enviamos un email a <strong>{account.email.trim()}</strong> para que confirmes tu
            cuenta. Cuando lo confirmes, el observatorio va a validar el alta de tu entidad y te
            vamos a avisar por email.
          </Text>
          <Button component={Link} to={ROLE_HOME[Role.COOPERATIVE]} h={48} mt="xs">
            Ingresar a mi panel
          </Button>
        </Stack>
      </Paper>
    );
  }

  const isAccountStep = step === 'account';

  return (
    <Paper withBorder radius={14} p={{ base: 24, xs: 36 }} maw={CARD_WIDTH} mx="auto" w="100%">
      <Stack gap={22}>
        <Stack gap={10}>
          <Text fz={13} fw={600} c="brand.8">
            Paso {isAccountStep ? 1 : 2} de 2
          </Text>
          <div className={styles.steps} aria-hidden="true">
            <span className={styles.step} data-active />
            <span className={styles.step} data-active={!isAccountStep || undefined} />
          </div>
          <Title order={1} fz={28} ref={headingRef} tabIndex={-1} className={styles.heading} mt={4}>
            {isAccountStep ? 'Tu cuenta' : 'Tu entidad'}
          </Title>
        </Stack>

        {isAccountStep ? (
          <form onSubmit={handleAccountSubmit} noValidate>
            <Stack gap={22}>
              <Alert variant="light" py={12} px={14} classNames={{ message: styles.notice }}>
                ¿Ya tenés una cuenta?{' '}
                <Anchor component={Link} to="/login" fw={600} inherit>
                  Ingresá
                </Anchor>{' '}
                y agregá la entidad desde tu panel.
              </Alert>
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
                <TextInput
                  label="Tu rol en la entidad"
                  placeholder="Presidenta, tesorero, asociada…"
                  autoComplete="organization-title"
                  maxLength={100}
                  value={account.registrantRole}
                  error={accountErrors.registrantRole}
                  onChange={(event) => {
                    updateAccount('registrantRole', event.currentTarget.value);
                  }}
                />
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
              <Button type="submit" h={48} fz={16}>
                Continuar
              </Button>
            </Stack>
          </form>
        ) : (
          <form onSubmit={(event) => void handleOrganizationSubmit(event)} noValidate>
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
              <OrganizationRegistrationFields
                value={organization}
                errors={organizationErrors}
                onChange={updateOrganization}
              />
              <Group gap="sm">
                <Button
                  variant="default"
                  className={styles.back}
                  h={48}
                  px={24}
                  fz={16}
                  onClick={() => {
                    setFormError(null);
                    setStep('account');
                  }}
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  h={48}
                  fz={16}
                  flex="1 1 200px"
                  loading={registration.isPending}
                  loaderProps={{ type: 'dots' }}
                >
                  Crear cuenta y entidad
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Paper>
  );
}
