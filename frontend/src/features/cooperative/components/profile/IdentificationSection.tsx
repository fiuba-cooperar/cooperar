import { SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useState } from 'react';
import { Visibility, type CooperativeOrganizationProfileResponse } from '@/api/generated/model';
import { formatCuit } from '@/features/organizations/cuit';
import { ORGANIZATION_TYPE_LABELS } from '@/features/organizations/labels';
import { SectionForm } from './SectionForm';
import { hasErrors, type Errors, type SectionProps } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

interface Form {
  name: string;
  legalName: string;
  legalNameVisibility: Visibility;
}

function fromProfile({ identification }: CooperativeOrganizationProfileResponse): Form {
  return {
    name: identification.name,
    legalName: identification.legalName ?? '',
    legalNameVisibility: identification.legalNameVisibility,
  };
}

function validate(form: Form): Errors<Form> {
  return {
    name: form.name.trim() ? undefined : 'Ingresá el nombre de la entidad.',
    legalName: form.legalName.trim() ? undefined : 'Ingresá la razón social.',
  };
}

export function IdentificationSection({ profile, hidden, saving, next, save }: SectionProps) {
  const [form, setForm] = useState(() => fromProfile(profile));
  const [errors, setErrors] = useState<Errors<Form>>({});

  function update<K extends keyof Form>(field: K, value: Form[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSave() {
    const validation = validate(form);
    setErrors(validation);
    if (hasErrors(validation)) return false;
    const saved = await save({
      section: 'identification',
      data: {
        name: form.name.trim(),
        legalName: form.legalName.trim(),
        legalNameVisibility: form.legalNameVisibility,
      },
    });
    setForm(fromProfile(saved));
    return true;
  }

  return (
    <SectionForm
      id="identification"
      title="Identificación"
      description="Lo que declaraste en el alta y aprobó el observatorio."
      hidden={hidden}
      saving={saving}
      next={next}
      onSave={onSave}
    >
      <Stack gap="md">
        <div>
          <FieldHeader
            htmlFor="profile-name"
            label="Nombre de la entidad"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <TextInput
            id="profile-name"
            maxLength={200}
            value={form.name}
            error={errors.name}
            onChange={(event) => {
              update('name', event.currentTarget.value);
            }}
          />
        </div>
        <div>
          <FieldHeader
            htmlFor="profile-legal-name"
            label="Razón social"
            visibility={
              <VisibilityToggle
                field="la razón social"
                value={form.legalNameVisibility}
                onChange={(visibility) => {
                  update('legalNameVisibility', visibility);
                }}
              />
            }
          />
          <TextInput
            id="profile-legal-name"
            maxLength={200}
            value={form.legalName}
            error={errors.legalName}
            onChange={(event) => {
              update('legalName', event.currentTarget.value);
            }}
          />
        </div>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-type"
              label="Tipo de entidad"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <TextInput id="profile-type" value={ORGANIZATION_TYPE_LABELS[profile.type]} disabled />
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-cuit"
              label="CUIT"
              visibility={<VisibilityBadge visibility={Visibility.PRIVATE} />}
            />
            <TextInput id="profile-cuit" value={formatCuit(profile.cuit)} disabled />
          </div>
        </SimpleGrid>
        <Text size="sm" c="dimmed">
          El tipo de entidad y el CUIT los validó el observatorio. Si hay un error, avisale al
          observatorio.
        </Text>
      </Stack>
    </SectionForm>
  );
}
