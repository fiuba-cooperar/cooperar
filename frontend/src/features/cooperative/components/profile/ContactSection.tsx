import { AppModal } from '@/components/AppModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CountedTextInput } from '@/components/form/CountedTextInput';
import { Alert, Button, Group, Select, SimpleGrid, Stack, UnstyledButton } from '@mantine/core';
import { IconAlertCircle, IconMessage, IconPencil } from '@tabler/icons-react';
import { useState } from 'react';
import {
  ResponseTime,
  Visibility,
  type CooperativeOrganizationProfileResponse,
  type ProfileContactRequest,
} from '@/api/generated/model';
import { RESPONSE_TIME_LABELS } from '@/features/organizations/labels';
import { formatOpeningHours } from '@/features/organizations/openingHours';
import { OpeningHoursField } from './OpeningHoursField';
import {
  periodsFromWeek,
  weekFromPeriods,
  weekProblems,
  withTypingProblems,
  withoutEmptyRanges,
  type WeekErrors,
  type WeekHours,
} from './openingHoursForm';
import { joinPhone, phoneProblem, splitPhone, type PhoneParts } from '@/components/form/phone';
import { PhoneField } from '@/components/form/PhoneField';
import styles from './ProfileSections.module.css';
import { SectionForm } from './SectionForm';
import { differs, hasErrors, type Errors, type SectionProps } from './sectionProps';
import { FieldHeader, VisibilityBadge, VisibilityToggle } from './Visibility';

const RESPONSE_TIMES = Object.values(ResponseTime);
const RESPONSE_TIME_OPTIONS = RESPONSE_TIMES.map((value) => ({
  value,
  label: RESPONSE_TIME_LABELS[value],
}));
const PHONE_HINT = 'Escribilo sin el 0 ni el 15 de celular.';
const EMAIL_HINT = 'Puede ser distinto del email con el que ingresás a CooperAR.';

interface Form {
  phone: PhoneParts;
  phoneVisibility: Visibility;
  whatsapp: PhoneParts;
  whatsappVisibility: Visibility;
  email: string;
  emailVisibility: Visibility;
  website: string;
  socialMedia: string;
  openingHours: WeekHours;
  responseTime: ResponseTime | null;
}

type TextField = 'email' | 'website' | 'socialMedia';

function fromProfile({ contact }: CooperativeOrganizationProfileResponse): Form {
  return {
    phone: splitPhone(contact.phone),
    phoneVisibility: contact.phoneVisibility,
    whatsapp: splitPhone(contact.whatsapp),
    whatsappVisibility: contact.whatsappVisibility,
    email: contact.email ?? '',
    emailVisibility: contact.emailVisibility,
    website: contact.website ?? '',
    socialMedia: contact.socialMedia ?? '',
    openingHours: weekFromPeriods(contact.openingHours),
    responseTime: contact.responseTime ?? null,
  };
}

function validate(form: Form): Errors<Form> {
  const email = form.email.trim();
  const website = form.website.trim();
  return {
    phone: phoneProblem(form.phone),
    whatsapp: phoneProblem(form.whatsapp),
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

/** One line for the closed section: the days with their hours, or that there are none yet. */
function hoursSummary(week: WeekHours): string {
  const complete = periodsFromWeek(week).filter(({ opensAt, closesAt }) => opensAt && closesAt);
  const parts = formatOpeningHours(complete).map(({ days, hours }) => `${days}: ${hours}`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin horarios cargados';
}

function toRequest(form: Form): ProfileContactRequest {
  const phone = joinPhone(form.phone);
  const whatsapp = joinPhone(form.whatsapp);
  const email = form.email.trim();
  const website = form.website.trim();
  const socialMedia = form.socialMedia.trim();
  return {
    ...(phone && { phone }),
    phoneVisibility: form.phoneVisibility,
    ...(whatsapp && { whatsapp }),
    whatsappVisibility: form.whatsappVisibility,
    ...(email && { email }),
    emailVisibility: form.emailVisibility,
    ...(website && { website }),
    ...(socialMedia && { socialMedia }),
    openingHours: periodsFromWeek(form.openingHours),
    ...(form.responseTime && { responseTime: form.responseTime }),
  };
}

export function ContactSection({
  profile,
  hidden,
  saving,
  next,
  save,
  onDirtyChange,
  revision,
}: SectionProps) {
  const [form, setForm] = useState(() => fromProfile(profile));
  const [errors, setErrors] = useState<Errors<Form>>({});
  const [seenRevision, setSeenRevision] = useState(revision);
  // The week is edited in a dialog, on a draft: it reaches the form only with «Guardar», and the profile only with
  // the button of the section. The section shows a line that says what is set.
  const [draft, setDraft] = useState<WeekHours | null>(null);
  const [draftErrors, setDraftErrors] = useState<WeekErrors>({});
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  if (seenRevision !== revision) {
    setSeenRevision(revision);
    setForm(fromProfile(profile));
    setErrors({});
    setDraft(null);
  }

  function openHours() {
    setDraft(form.openingHours);
    setDraftErrors({});
  }

  /** Closing the dialog loses what was edited in it, so it asks first when there is something to lose. */
  function closeHours() {
    if (draft && differs(draft, form.openingHours)) {
      setConfirmingDiscard(true);
    } else {
      setDraft(null);
    }
  }

  function applyHours() {
    if (!draft) return;
    const week = withoutEmptyRanges(draft);
    const problems = weekProblems(week);
    setDraftErrors(problems);
    if (Object.keys(problems).length > 0) {
      setDraft(week);
      return;
    }
    setForm((current) => ({
      ...current,
      openingHours: week,
    }));
    setDraft(null);
  }

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
      <CountedTextInput
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
      dirty={differs(form, fromProfile(profile))}
      onDirtyChange={onDirtyChange}
      onSave={onSave}
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <div>
            <FieldHeader
              htmlFor="profile-phone"
              label="Teléfono"
              hint={PHONE_HINT}
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
            <PhoneField
              id="profile-phone"
              label="Característica del teléfono"
              autoComplete="tel-national"
              description={PHONE_HINT}
              value={form.phone}
              error={errors.phone}
              onChange={(phone) => {
                update('phone', phone);
              }}
            />
          </div>
          <div>
            <FieldHeader
              htmlFor="profile-whatsapp"
              label="WhatsApp"
              hint={PHONE_HINT}
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
            <PhoneField
              id="profile-whatsapp"
              label="Característica del WhatsApp"
              description={PHONE_HINT}
              value={form.whatsapp}
              error={errors.whatsapp}
              onChange={(whatsapp) => {
                update('whatsapp', whatsapp);
              }}
            />
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
          <CountedTextInput
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
        <fieldset className={styles.fieldset}>
          <FieldHeader
            legend
            label="Horarios de atención"
            visibility={<VisibilityBadge visibility={Visibility.PUBLIC} />}
          />
          <UnstyledButton
            type="button"
            className={styles.hoursToggle}
            aria-haspopup="dialog"
            onClick={openHours}
          >
            <span>{hoursSummary(form.openingHours)}</span>
            <span className={styles.hoursEdit}>
              <IconPencil size={16} aria-hidden />
              Editar
            </span>
          </UnstyledButton>
          <AppModal
            opened={draft !== null}
            onClose={closeHours}
            title="Horarios de atención"
            size="xl"
          >
            <Stack gap="md">
              <OpeningHoursField
                value={draft ?? form.openingHours}
                errors={withTypingProblems(draftErrors, draft ?? form.openingHours)}
                onChange={(day, ranges) => {
                  setDraft((current) => current && { ...current, [day]: ranges });
                  setDraftErrors((current) => ({ ...current, [day]: undefined }));
                }}
              />
              <Group justify="flex-end">
                <Button h={44} onClick={applyHours}>
                  Guardar
                </Button>
              </Group>
            </Stack>
          </AppModal>
          <ConfirmDialog
            opened={confirmingDiscard}
            title="Tenés cambios sin guardar"
            icon={<IconAlertCircle aria-hidden />}
            confirmLabel="Descartar cambios"
            onConfirm={() => {
              setConfirmingDiscard(false);
              setDraft(null);
            }}
            onClose={() => {
              setConfirmingDiscard(false);
            }}
          >
            Si cerrás ahora, se pierden los horarios que editaste y no guardaste.
          </ConfirmDialog>
        </fieldset>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
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
          Los datos que marques como privados no se muestran en la ficha. Aun así, los visitantes
          pueden enviarte consultas desde el formulario de la ficha.
        </Alert>
      </Stack>
    </SectionForm>
  );
}
