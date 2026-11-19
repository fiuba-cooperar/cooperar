import { Alert, Select, SimpleGrid, TextInput } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { ResponseTime } from '@/api/generated/model';
import { RESPONSE_TIME_LABELS } from '@/features/organizations/labels';
import { useSaveContact } from '../api/useManagedProfile';
import { ProfileField } from './ProfileField';
import { SectionForm } from './SectionForm';
import type { SectionProps } from './IdentificationSection';

const RESPONSE_TIMES = Object.values(ResponseTime);
const RESPONSE_TIME_OPTIONS = RESPONSE_TIMES.map((value) => ({
  value,
  label: RESPONSE_TIME_LABELS[value],
}));
const WEBSITE = /^https?:\/\/\S+$/;

export function ContactSection({ profile, nextLabel, onNext }: SectionProps) {
  const save = useSaveContact(profile.id);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [phonePublic, setPhonePublic] = useState(profile.phonePublic);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp ?? '');
  const [whatsappPublic, setWhatsappPublic] = useState(profile.whatsappPublic);
  const [email, setEmail] = useState(profile.email ?? '');
  const [emailPublic, setEmailPublic] = useState(profile.emailPublic);
  const [website, setWebsite] = useState(profile.website ?? '');
  const [socialMedia, setSocialMedia] = useState(profile.socialMedia ?? '');
  const [openingHours, setOpeningHours] = useState(profile.openingHours ?? '');
  const [responseTime, setResponseTime] = useState<ResponseTime | null>(
    profile.responseTime ?? null,
  );
  const [problem, setProblem] = useState<Record<string, string>>({});

  function submit() {
    const problems: Record<string, string> = {};
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()))
      problems.email = 'Revisá el email: tiene que ser como contacto@cooperativa.org.';
    if (website.trim() && !WEBSITE.test(website.trim()))
      problems.website = 'Ingresá el link completo, que empiece con https://.';
    setProblem(problems);
    if (Object.keys(problems).length > 0) return;
    save.mutate({
      phone,
      phonePublic,
      whatsapp,
      whatsappPublic,
      email: email.trim(),
      emailPublic,
      website: website.trim(),
      socialMedia,
      openingHours,
      ...(responseTime && { responseTime }),
    });
  }

  return (
    <SectionForm
      id="section-contact"
      title="Contacto y atención"
      description="Cómo te pueden contactar el público y otras cooperativas."
      saving={save.isPending}
      saved={save.isSuccess}
      error={save.error}
      onSubmit={submit}
      nextLabel={nextLabel}
      {...(onNext && { onNext })}
    >
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ProfileField
          htmlFor="profile-phone"
          label="Teléfono"
          visibility={{ isPublic: phonePublic, onChange: setPhonePublic }}
        >
          <TextInput
            id="profile-phone"
            type="tel"
            maxLength={50}
            value={phone}
            onChange={(event) => {
              setPhone(event.currentTarget.value);
            }}
          />
        </ProfileField>
        <ProfileField
          htmlFor="profile-whatsapp"
          label="WhatsApp"
          visibility={{ isPublic: whatsappPublic, onChange: setWhatsappPublic }}
        >
          <TextInput
            id="profile-whatsapp"
            type="tel"
            maxLength={50}
            value={whatsapp}
            onChange={(event) => {
              setWhatsapp(event.currentTarget.value);
            }}
          />
        </ProfileField>
      </SimpleGrid>
      <ProfileField
        htmlFor="profile-email"
        label="Email de contacto"
        visibility={{ isPublic: emailPublic, onChange: setEmailPublic }}
        error={problem.email}
      >
        <TextInput
          id="profile-email"
          type="email"
          maxLength={254}
          description="Puede ser distinto del email con el que ingresás a cooperAR."
          value={email}
          onChange={(event) => {
            setEmail(event.currentTarget.value);
          }}
        />
      </ProfileField>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ProfileField
          htmlFor="profile-website"
          label="Sitio web"
          fixed="public"
          error={problem.website}
        >
          <TextInput
            id="profile-website"
            type="url"
            placeholder="https://"
            maxLength={300}
            value={website}
            onChange={(event) => {
              setWebsite(event.currentTarget.value);
            }}
          />
        </ProfileField>
        <ProfileField htmlFor="profile-social" label="Redes sociales" fixed="public">
          <TextInput
            id="profile-social"
            placeholder="Ej.: @cooperativaejemplo"
            maxLength={300}
            value={socialMedia}
            onChange={(event) => {
              setSocialMedia(event.currentTarget.value);
            }}
          />
        </ProfileField>
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
        <ProfileField htmlFor="profile-hours" label="Horarios de atención" fixed="public">
          <TextInput
            id="profile-hours"
            placeholder="Ej.: lunes a viernes de 8 a 17"
            maxLength={200}
            value={openingHours}
            onChange={(event) => {
              setOpeningHours(event.currentTarget.value);
            }}
          />
        </ProfileField>
        <ProfileField
          htmlFor="profile-response"
          label="Tiempo estimado de respuesta"
          fixed="public"
        >
          <Select
            id="profile-response"
            data={RESPONSE_TIME_OPTIONS}
            clearable
            placeholder="Elegí una opción"
            value={responseTime}
            onChange={(value) => {
              setResponseTime(RESPONSE_TIMES.find((item) => item === value) ?? null);
            }}
          />
        </ProfileField>
      </SimpleGrid>
      <Alert icon={<IconInfoCircle aria-hidden />} color="brand" variant="light">
        Aunque ocultes el teléfono, el WhatsApp y el email, el público te puede escribir con el
        formulario de consultas de tu ficha. Las consultas te llegan y nadie más ve los datos de
        quien escribe.
      </Alert>
    </SectionForm>
  );
}
