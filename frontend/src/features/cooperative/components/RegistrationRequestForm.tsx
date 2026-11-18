import { Alert, Button, Group, Stack, TextInput } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState, type SyntheticEvent } from 'react';
import { Link } from 'react-router';
import type {
  CooperativeRegistrationRequestResponse,
  RegistrationOrganizationRequest,
} from '@/api/generated/model';
import { OrganizationRegistrationFields } from '@/features/organizations/components/OrganizationRegistrationFields';
import {
  CUIT_TAKEN,
  EMPTY_ORGANIZATION,
  formFromRegistration,
  hasErrors,
  toRegistrationRequest,
  validateOrganization,
  type FormErrors,
  type OrganizationForm,
} from '@/features/organizations/registrationForm';
import { RequestSubmissionError } from '../api/useRegistrationRequest';

type Errors = FormErrors<OrganizationForm & { registrantRole: string }>;

/**
 * The data of a registration request with the role of the person sending it, to send a new one or correct one the
 * observatory sent back. Shows the errors of the submission, which `onSubmit` reports as a
 * {@link RequestSubmissionError}.
 */
export function RegistrationRequestForm({
  initial,
  submitLabel,
  cancelPath,
  submitting,
  formErrors,
  onSubmit,
}: {
  initial?: CooperativeRegistrationRequestResponse;
  submitLabel: string;
  cancelPath: string;
  submitting: boolean;
  formErrors: Record<Exclude<RequestSubmissionError['reason'], 'cuit-taken'>, string>;
  onSubmit: (body: RegistrationOrganizationRequest) => Promise<void>;
}) {
  const [organization, setOrganization] = useState(() =>
    initial ? formFromRegistration(initial) : EMPTY_ORGANIZATION,
  );
  const [registrantRole, setRegistrantRole] = useState(initial?.registrantRole ?? '');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function updateOrganization<K extends keyof OrganizationForm>(
    field: K,
    value: OrganizationForm[K],
  ) {
    setOrganization((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation: Errors = validateOrganization(organization);
    if (!registrantRole.trim()) validation.registrantRole = 'Ingresá tu rol en la entidad.';
    setErrors(validation);
    const body = toRegistrationRequest(organization, registrantRole);
    if (hasErrors(validation) || !body) return;

    setFormError(null);
    try {
      await onSubmit(body);
    } catch (caught) {
      const reason = caught instanceof RequestSubmissionError ? caught.reason : 'unavailable';
      if (reason === 'cuit-taken') setErrors((current) => ({ ...current, cuit: CUIT_TAKEN }));
      else setFormError(formErrors[reason]);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} noValidate>
      <Stack gap={22}>
        {formError && (
          <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
            {formError}
          </Alert>
        )}
        <Stack gap="md">
          <OrganizationRegistrationFields
            value={organization}
            errors={errors}
            onChange={updateOrganization}
          />
        </Stack>
        <TextInput
          label="Tu rol en la entidad"
          placeholder="Presidenta, tesorero, asociada…"
          autoComplete="organization-title"
          maxLength={100}
          value={registrantRole}
          error={errors.registrantRole}
          onChange={(event) => {
            setRegistrantRole(event.currentTarget.value);
            setErrors((current) => ({ ...current, registrantRole: undefined }));
          }}
        />
        <Group gap="sm">
          <Button component={Link} to={cancelPath} variant="default" h={48}>
            Cancelar
          </Button>
          <Button
            type="submit"
            h={48}
            flex="1 1 200px"
            loading={submitting}
            loaderProps={{ type: 'dots' }}
          >
            {submitLabel}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
