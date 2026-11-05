import {
  Alert,
  Button,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useId, useState, type SyntheticEvent } from 'react';
import { Province, Sector, type EditableProfileResponse } from '@/api/generated/model';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { PROVINCE_LABELS, SECTOR_LABELS } from '@/features/organizations/labels';
import { EditError } from '../api/useProfileEditing';
import { useSaveProfile } from '../api/useProfileEditing';
import {
  MAX_DESCRIPTION_LENGTH,
  toForm,
  toRequest,
  validate,
  type ProfileErrors,
  type ProfileForm as Form,
} from '../profileForm';

const SECTOR_OPTIONS = Object.values(Sector).map((value) => ({
  value,
  label: SECTOR_LABELS[value],
}));
const PROVINCE_OPTIONS = Object.values(Province).map((value) => ({
  value,
  label: PROVINCE_LABELS[value],
}));

const STREET_HINT = 'Si cambiás la dirección, actualizamos el punto del mapa.';
const EMAIL_HINT = 'Es el email que ve el público. Puede ser distinto del de tu cuenta.';
const SAVE_ERRORS: Record<EditError['reason'], string> = {
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  'too-large': 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  limit: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  forbidden: 'No tenés permiso para editar esta organización.',
  unavailable:
    'No pudimos guardar los cambios por un problema de conexión. Intentá de nuevo en unos minutos.',
};

export function ProfileForm({ profile }: { profile: EditableProfileResponse }) {
  const save = useSaveProfile(profile.id);
  const [form, setForm] = useState(() => toForm(profile));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const streetId = useId();
  const emailId = useId();

  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    const request = toRequest(form);
    if (Object.keys(found).length > 0 || !request) return;

    setSaved(false);
    setFailure(null);
    try {
      await save.mutateAsync(request);
      setSaved(true);
    } catch (caught) {
      setFailure(SAVE_ERRORS[caught instanceof EditError ? caught.reason : 'unavailable']);
    }
  }

  return (
    <Paper component="section" withBorder radius="lg" p="lg" aria-labelledby="profile-data">
      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <Stack gap="md">
          <Title order={2} size="h3" id="profile-data">
            Datos de la ficha
          </Title>
          {failure && (
            <Alert icon={<IconAlertCircle aria-hidden="true" />} color="red" role="alert">
              {failure}
            </Alert>
          )}
          {saved && (
            <Alert icon={<IconCircleCheck aria-hidden="true" />} color="green" role="status">
              Guardamos los cambios.
            </Alert>
          )}
          <Select
            label="Rubro"
            data={SECTOR_OPTIONS}
            value={form.sector}
            error={errors.sector}
            allowDeselect={false}
            onChange={(value) => {
              update('sector', value);
            }}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <Select
              label="Provincia"
              data={PROVINCE_OPTIONS}
              value={form.province}
              error={errors.province}
              allowDeselect={false}
              searchable
              onChange={(value) => {
                update('province', value);
              }}
            />
            <TextInput
              label="Departamento, partido o comuna"
              maxLength={100}
              value={form.district}
              error={errors.district}
              onChange={(event) => {
                update('district', event.currentTarget.value);
              }}
            />
            <TextInput
              label="Localidad o barrio"
              maxLength={100}
              value={form.locality}
              error={errors.locality}
              onChange={(event) => {
                update('locality', event.currentTarget.value);
              }}
            />
            <div>
              <LabelWithHint htmlFor={streetId} label="Calle y número" hint={STREET_HINT} />
              <TextInput
                id={streetId}
                aria-description={STREET_HINT}
                maxLength={200}
                value={form.street}
                error={errors.street}
                onChange={(event) => {
                  update('street', event.currentTarget.value);
                }}
              />
            </div>
          </SimpleGrid>
          <TextInput
            label="Referencias (opcional)"
            maxLength={300}
            value={form.additionalReferences}
            onChange={(event) => {
              update('additionalReferences', event.currentTarget.value);
            }}
          />
          <Textarea
            label="Descripción (opcional)"
            description="Contá qué producen o qué servicios ofrecen, desde cuándo trabajan y quiénes integran la organización."
            rows={6}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={form.description}
            onChange={(event) => {
              update('description', event.currentTarget.value);
            }}
          />
          <Text size="xs" c="dimmed" ta="right">
            {form.description.length} de {MAX_DESCRIPTION_LENGTH} caracteres
          </Text>
          <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
            <TextInput
              label="Teléfono (opcional)"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) => {
                update('phone', event.currentTarget.value);
              }}
            />
            <div>
              <LabelWithHint
                htmlFor={emailId}
                label="Email de contacto (opcional)"
                hint={EMAIL_HINT}
              />
              <TextInput
                id={emailId}
                aria-description={EMAIL_HINT}
                type="email"
                maxLength={254}
                value={form.email}
                error={errors.email}
                onChange={(event) => {
                  update('email', event.currentTarget.value);
                }}
              />
            </div>
          </SimpleGrid>
          <Button
            type="submit"
            h={48}
            loading={save.isPending}
            w={{ base: '100%', xs: 'fit-content' }}
          >
            Guardar cambios
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
