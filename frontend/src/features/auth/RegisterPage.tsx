import {
  Alert,
  Anchor,
  Button,
  Fieldset,
  Group,
  Paper,
  PasswordInput,
  Select,
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
import { OrganizationType, Province, Role, Sector } from '@/api/generated/model';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { OrganizationTypePicker } from '@/features/organizations/components/OrganizationTypePicker';
import { cuitProblem, type CuitProblem } from '@/features/organizations/cuit';
import { PROVINCE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { RegistrationError, useRegistration } from './api/useRegistration';
import styles from './RegisterPage.module.css';
import { ROLE_HOME } from './roleHome';
import { useAuth } from './useAuth';

type Step = 'account' | 'organization' | 'done';

interface AccountForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

interface OrganizationForm {
  type: OrganizationType | null;
  name: string;
  cuit: string;
  sector: Sector | null;
  province: Province | null;
  district: string;
  locality: string;
  street: string;
  additionalReferences: string;
}

// Cleared errors stay as undefined keys, so only check freshly validated objects with hasErrors.
type Errors<T> = { [K in keyof T]?: string | undefined };

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

const EMPTY_ORGANIZATION: OrganizationForm = {
  type: null,
  name: '',
  cuit: '',
  sector: null,
  province: null,
  district: '',
  locality: '',
  street: '',
  additionalReferences: '',
};

const SECTORS = Object.values(Sector);
const PROVINCES = Object.values(Province);
const SECTOR_OPTIONS = SECTORS.map((value) => ({ value, label: SECTOR_LABELS[value] }));
const PROVINCE_OPTIONS = PROVINCES.map((value) => ({ value, label: PROVINCE_LABELS[value] }));

const EMAIL_HINT =
  'Es tu usuario para ingresar. Con esta cuenta vas a poder administrar una o más organizaciones.';
const PASSWORD_HINT = `Usá al menos ${String(MIN_PASSWORD_LENGTH)} caracteres.`;
const EMAIL_TAKEN =
  'Ya hay una cuenta con este email. Si es tuya, ingresá y agregá la organización desde tu panel.';
const CUIT_ERRORS: Record<CuitProblem, string> = {
  format: 'Revisá el CUIT: son 11 números, por ejemplo 30-12345678-1.',
  'check-digit': 'Este CUIT no existe. Revisá que los números estén bien escritos.',
};
const CUIT_TAKEN = 'Ya hay una organización registrada con este CUIT.';
const FORM_ERRORS: Record<RegistrationError['reason'], string> = {
  conflict: 'Algunos datos ya están registrados. Revisalos e intentá de nuevo.',
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  unavailable:
    'No pudimos completar el registro por un problema de conexión. Intentá de nuevo en unos minutos.',
};

function validateAccount(form: AccountForm): Errors<AccountForm> {
  const errors: Errors<AccountForm> = {};
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

function validateOrganization(form: OrganizationForm): Errors<OrganizationForm> {
  const errors: Errors<OrganizationForm> = {};
  if (!form.type) errors.type = 'Elegí si es una cooperativa, una empresa recuperada o ambas.';
  if (!form.name.trim()) errors.name = 'Ingresá el nombre de la organización.';
  if (!form.cuit.trim()) errors.cuit = 'Ingresá el CUIT.';
  else {
    const problem = cuitProblem(form.cuit);
    if (problem) errors.cuit = CUIT_ERRORS[problem];
  }
  if (!form.sector) errors.sector = 'Elegí un rubro.';
  if (!form.province) errors.province = 'Elegí una provincia.';
  if (!form.district.trim()) errors.district = 'Ingresá el departamento, partido o comuna.';
  if (!form.locality.trim()) errors.locality = 'Ingresá la localidad o el barrio.';
  if (!form.street.trim()) errors.street = 'Ingresá la calle y el número.';
  return errors;
}

function hasErrors(errors: object) {
  return Object.keys(errors).length > 0;
}

export function RegisterPage() {
  const { user, login } = useAuth();
  const registration = useRegistration();
  const [step, setStep] = useState<Step>('account');
  const [account, setAccount] = useState(EMPTY_ACCOUNT);
  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);
  const [accountErrors, setAccountErrors] = useState<Errors<AccountForm>>({});
  const [organizationErrors, setOrganizationErrors] = useState<Errors<OrganizationForm>>({});
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
    const { type, sector, province } = organization;
    if (hasErrors(errors) || !type || !sector || !province) return;

    setFormError(null);
    try {
      await registration.mutateAsync({
        account: {
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          email: account.email.trim(),
          password: account.password,
        },
        organization: {
          name: organization.name.trim(),
          type,
          cuit: organization.cuit.trim(),
          sector,
          address: {
            province,
            district: organization.district.trim(),
            locality: organization.locality.trim(),
            street: organization.street.trim(),
            ...(organization.additionalReferences.trim() && {
              additionalReferences: organization.additionalReferences.trim(),
            }),
          },
        },
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
            cuenta. Cuando lo confirmes, el observatorio va a revisar el alta de tu organización y
            te vamos a avisar por email.
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
            {isAccountStep ? 'Tu cuenta' : 'Tu organización'}
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
                y agregá la organización desde tu panel.
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
              <Stack gap="md">
                <OrganizationTypePicker
                  value={organization.type}
                  error={organizationErrors.type}
                  onChange={(type) => {
                    updateOrganization('type', type);
                  }}
                />
                <TextInput
                  label="Nombre de la organización"
                  maxLength={200}
                  value={organization.name}
                  error={organizationErrors.name}
                  onChange={(event) => {
                    updateOrganization('name', event.currentTarget.value);
                  }}
                />
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                  <TextInput
                    label="CUIT"
                    inputMode="numeric"
                    placeholder="30-12345678-1"
                    maxLength={15}
                    value={organization.cuit}
                    error={organizationErrors.cuit}
                    onChange={(event) => {
                      updateOrganization('cuit', event.currentTarget.value);
                    }}
                  />
                  <Select
                    label="Rubro"
                    placeholder="Elegí un rubro"
                    data={SECTOR_OPTIONS}
                    value={organization.sector}
                    error={organizationErrors.sector}
                    onChange={(value) => {
                      updateOrganization(
                        'sector',
                        SECTORS.find((sector) => sector === value) ?? null,
                      );
                    }}
                  />
                </SimpleGrid>
              </Stack>
              <Fieldset
                variant="unstyled"
                // No inset or browser margin, so the address fields line up with the ones above.
                p={0}
                m={0}
                styles={{ legend: { padding: 0 } }}
                legend={
                  <Title order={2} fz={18} mb="sm">
                    Dirección
                  </Title>
                }
              >
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                    <Select
                      label="Provincia"
                      placeholder="Elegí una provincia"
                      searchable
                      nothingFoundMessage="No encontramos esa provincia"
                      autoComplete="address-level1"
                      data={PROVINCE_OPTIONS}
                      value={organization.province}
                      error={organizationErrors.province}
                      onChange={(value) => {
                        updateOrganization(
                          'province',
                          PROVINCES.find((province) => province === value) ?? null,
                        );
                      }}
                    />
                    <TextInput
                      label="Departamento/Partido/Comuna"
                      maxLength={100}
                      value={organization.district}
                      error={organizationErrors.district}
                      onChange={(event) => {
                        updateOrganization('district', event.currentTarget.value);
                      }}
                    />
                  </SimpleGrid>
                  <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                    <TextInput
                      label="Localidad/Barrio"
                      autoComplete="address-level2"
                      maxLength={100}
                      value={organization.locality}
                      error={organizationErrors.locality}
                      onChange={(event) => {
                        updateOrganization('locality', event.currentTarget.value);
                      }}
                    />
                    <TextInput
                      label="Calle y número"
                      placeholder="Av. Rivadavia 1234"
                      autoComplete="address-line1"
                      maxLength={200}
                      value={organization.street}
                      error={organizationErrors.street}
                      onChange={(event) => {
                        updateOrganization('street', event.currentTarget.value);
                      }}
                    />
                  </SimpleGrid>
                  <TextInput
                    label="Referencias adicionales (opcional)"
                    placeholder="Piso, local, entre calles…"
                    autoComplete="address-line2"
                    maxLength={300}
                    value={organization.additionalReferences}
                    error={organizationErrors.additionalReferences}
                    onChange={(event) => {
                      updateOrganization('additionalReferences', event.currentTarget.value);
                    }}
                  />
                </Stack>
              </Fieldset>
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
                  Crear cuenta y organización
                </Button>
              </Group>
            </Stack>
          </form>
        )}
      </Stack>
    </Paper>
  );
}
