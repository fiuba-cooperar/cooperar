import { Alert, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { IconMessage } from '@tabler/icons-react';
import { useState } from 'react';
import {
  ResponseTime,
  Visibility,
  type CooperativeOrganizationProfileResponse,
  type ProfileContactRequest,
} from '@/api/generated/model';
import { RESPONSE_TIME_LABELS } from '@/features/organizations/labels';
import { SectionForm } from './SectionForm';
import { hasErrors, type Errors, type SectionProps } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

const RESPONSE_TIMES = Object.values(ResponseTime);
const RESPONSE_TIME_OPTIONS = RESPONSE_TIMES.map((value) => ({
  value,
  label: RESPONSE_TIME_LABELS[value],
}));
const EMAIL_HINT = 'Puede ser distinto del email con el que ingresás a CooperAR.';

interface Form {
  phone: string;
  phoneVisibility: Visibility;
  whatsapp: string;
  whatsappVisibility: Visibility;
  email: string;
  emailVisibility: Visibility;
  website: string;
  socialMedia: string;
  openingHours: string;
  responseTime: ResponseTime | null;
}

type TextField = 'phone' | 'whatsapp' | 'email' | 'website' | 'socialMedia' | 'openingHours';

function fromProfile({ contact }: CooperativeOrganizationProfileResponse): Form {
  return {
    phone: contact.phone ?? '',
    phoneVisibility: contact.phoneVisibility,
    whatsapp: contact.whatsapp ?? '',
    whatsappVisibility: contact.whatsappVisibility,
    email: contact.email ?? '',
    emailVisibility: contact.emailVisibility,
    website: contact.website ?? '',
    socialMedia: contact.socialMedia ?? '',
    openingHours: contact.openingHours ?? '',
    responseTime: contact.responseTime ?? null,
  };
}

function validate(form: Form): Errors<Form> {
  const email = form.email.trim();
  const website = form.website.trim();
  return {
    email:
      email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Revisá el email, por ejemplo contacto@cooperativa.org.'
        : undefined,
    website:
      website && !/^https?:\/\/\S+$/.test(website)
        ? 'Escribí la dirección completa, empezando con https://'
        : undefined,
  };
}

function toRequest(form: Form): ProfileContactRequest {
  const phone = form.phone.trim();
  const whatsapp = form.whatsapp.trim();
  const email = form.email.trim();
  const website = form.website.trim();
  const socialMedia = form.socialMedia.trim();
  const openingHours = form.openingHours.trim();
  return {
    ...(phone && { phone }),
    phoneVisibility: form.phoneVisibility,
    ...(whatsapp && { whatsapp }),
    whatsappVisibility: form.whatsappVisibility,
    ...(email && { email }),
    emailVisibility: form.emailVisibility,
    ...(website && { website }),
    ...(socialMedia && { socialMedia }),
    ...(openingHours && { openingHours }),
    ...(form.responseTime && { responseTime: form.responseTime }),
  };
}

export function ContactSection({ profile, hidden, saving, next, save }: SectionProps) {
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
    const saved = await save({ section: 'contact', data: toRequest(form) });
    setForm(fromProfile(saved));
    return true;
  }

  function textInput(
    field: TextField,
    props: { type?: string; placeholder?: string; autoComplete?: string; maxLength: number },
  ) {
    return (
      <TextInput
        id={`profile-${field}`}
        type={props.type ?? 'text'}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        maxLength={props.maxLength}
        value={form[field]}
        error={errors[field]}
        onChange={(event) => {
          update(field, event.currentTarget.value);
        }}
      />
    );
  }

  return (
    <SectionForm
      id="contact"
      title="Contacto y atención"
      description="Cómo te pueden contactar el público y otras cooperativas."
      hidden={hidden}
      saving={saving}
      next={next}
      onSave={onSave}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-phone"
              label="Teléfono"
              visibility={
                <VisibilityToggle
                  field="el teléfono"
                  value={form.phoneVisibility}
                  onChange={(visibility) => {
                    update('phoneVisibility', visibility);
                  }}
                />
              }
            />
            {textInput('phone', { type: 'tel', autoComplete: 'tel', maxLength: 50 })}
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-whatsapp"
              label="WhatsApp"
              visibility={
                <VisibilityToggle
                  field="el WhatsApp"
                  value={form.whatsappVisibility}
                  onChange={(visibility) => {
                    update('whatsappVisibility', visibility);
                  }}
                />
              }
            />
            {textInput('whatsapp', { type: 'tel', maxLength: 50 })}
          </div>
        </SimpleGrid>
        <div>
          <FieldHeader
            htmlFor="profile-email"
            label="Email de contacto"
            hint={EMAIL_HINT}
            visibility={
              <VisibilityToggle
                field="el email"
                value={form.emailVisibility}
                onChange={(visibility) => {
                  update('emailVisibility', visibility);
                }}
              />
            }
          />
          <TextInput
            id="profile-email"
            type="email"
            autoComplete="email"
            maxLength={200}
            aria-description={EMAIL_HINT}
            value={form.email}
            error={errors.email}
            onChange={(event) => {
              update('email', event.currentTarget.value);
            }}
          />
        </div>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-website"
              label="Sitio web"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            {textInput('website', {
              type: 'url',
              placeholder: 'https://',
              autoComplete: 'url',
              maxLength: 300,
            })}
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-socialMedia"
              label="Redes sociales"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            {textInput('socialMedia', {
              placeholder: 'Ej.: @cooperativaejemplo',
              maxLength: 200,
            })}
          </div>
        </SimpleGrid>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-openingHours"
              label="Horarios de atención"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            {textInput('openingHours', {
              placeholder: 'Ej.: lunes a viernes de 8 a 17',
              maxLength: 200,
            })}
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-response-time"
              label="Tiempo estimado de respuesta"
              visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
            />
            <Select
              id="profile-response-time"
              placeholder="Elegí una opción"
              clearable
              data={RESPONSE_TIME_OPTIONS}
              value={form.responseTime}
              onChange={(value) => {
                update('responseTime', RESPONSE_TIMES.find((time) => time === value) ?? null);
              }}
            />
          </div>
        </SimpleGrid>
        <Alert variant="light" icon={<IconMessage aria-hidden />}>
          Aunque ocultes el teléfono, el WhatsApp y el email, el público te va a poder escribir con
          el formulario de consultas de tu ficha, y nadie más va a ver los datos de quien te
          escribe.
        </Alert>
      </Stack>
    </SectionForm>
  );
}
