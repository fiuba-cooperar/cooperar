import { Alert, Button, Group, NumberInput, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useId, useState, type SyntheticEvent } from 'react';
import { AppModal } from '@/components/AppModal';
import { CharacterCount } from '@/components/form/CharacterCount';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { PhoneField } from '@/components/form/PhoneField';
import { joinPhone, phoneProblem, type PhoneParts } from '@/components/form/phone';
import { hasErrors, type FormErrors } from '@/features/organizations/registrationForm';
import { InquiryError, useSendInquiry } from '../api/useSendInquiry';

interface InquiryFormState {
  senderName: string;
  senderEmail: string;
  senderPhone: PhoneParts;
  quantity: number | string;
  message: string;
}

const EMPTY_FORM: InquiryFormState = {
  senderName: '',
  senderEmail: '',
  senderPhone: { areaCode: '', number: '' },
  quantity: '',
  message: '',
};

const MAX_NAME = 100;
const MAX_EMAIL = 200;
const PHONE_HINT = 'Escribilo sin el 0 ni el 15 de celular.';
// The same check as the email of the profile of an organization.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 2000;
const MAX_QUANTITY = 1_000_000;

const FORM_ERRORS: Record<InquiryError['reason'], string> = {
  invalid: 'Algunos datos no son válidos. Revisalos e intentá de nuevo.',
  'rate-limited':
    'Se alcanzó el límite de consultas enviadas desde esta conexión. Podrá intentarse nuevamente más tarde.',
  'not-found': 'El producto ya no está disponible, por lo que no es posible enviar la consulta.',
  unavailable:
    'No fue posible enviar la consulta por un problema de conexión. Intentá de nuevo en unos minutos.',
};

function validate(form: InquiryFormState, isService: boolean): FormErrors<InquiryFormState> {
  const errors: FormErrors<InquiryFormState> = {};
  if (!form.senderName.trim()) errors.senderName = 'Ingresá tu nombre.';
  const email = form.senderEmail.trim();
  if (!email) errors.senderEmail = 'Ingresá tu email para que la cooperativa pueda responderte.';
  else if (!EMAIL_FORMAT.test(email))
    errors.senderEmail = 'Revisá el email, por ejemplo contacto@cooperativa.org.';
  const phone = phoneProblem(form.senderPhone);
  if (phone) errors.senderPhone = phone;
  if (
    !isService &&
    form.quantity !== '' &&
    (typeof form.quantity !== 'number' || form.quantity < 1)
  )
    errors.quantity = 'La cantidad tiene que ser un número mayor a cero.';
  if (!form.message.trim()) errors.message = 'Escribí el mensaje para la cooperativa.';
  return errors;
}

/** The dialog with the form to ask the organization about a product, without an account. */
export function InquiryForm({
  productId,
  isService,
  opened,
  onClose,
}: {
  productId: string;
  /** Services have no quantity to ask for. */
  isService: boolean;
  opened: boolean;
  onClose: () => void;
}) {
  const send = useSendInquiry();
  const phoneId = useId();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors<InquiryFormState>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function update<K extends keyof InquiryFormState>(field: K, value: InquiryFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(form, isService);
    setErrors(found);
    if (hasErrors(found)) return;

    setFormError(null);
    const phone = joinPhone(form.senderPhone);
    try {
      await send.mutateAsync({
        productId,
        inquiry: {
          senderName: form.senderName.trim(),
          senderEmail: form.senderEmail.trim(),
          ...(phone && { senderPhone: phone }),
          message: form.message.trim(),
          ...(!isService && typeof form.quantity === 'number' && { quantity: form.quantity }),
        },
      });
    } catch (caught) {
      const error = caught instanceof InquiryError ? caught : new InquiryError('unavailable');
      setFormError(FORM_ERRORS[error.reason]);
      return;
    }
    setSent(true);
  }

  return (
    <AppModal
      opened={opened}
      onClose={onClose}
      title="Formulario de contacto"
      closeButtonProps={{ 'aria-label': 'Cerrar el formulario' }}
      size="lg"
    >
      <Stack gap={16}>
        {sent ? (
          <Alert
            role="status"
            color="green"
            icon={<IconCircleCheck aria-hidden />}
            title="Consulta enviada"
          >
            Se registró tu consulta y fue derivada a la cooperativa, que responderá por el medio de
            contacto indicado.
          </Alert>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)} noValidate>
            <Stack gap="md">
              <Text fz={14} c="dimmed">
                El contacto indicado solo lo ve la cooperativa.
              </Text>
              <TextInput
                label="Nombre"
                required
                maxLength={MAX_NAME}
                autoComplete="name"
                value={form.senderName}
                error={errors.senderName}
                onChange={(event) => {
                  update('senderName', event.currentTarget.value);
                }}
              />
              <TextInput
                label="Email"
                required
                type="email"
                autoComplete="email"
                maxLength={MAX_EMAIL}
                value={form.senderEmail}
                error={errors.senderEmail}
                onChange={(event) => {
                  update('senderEmail', event.currentTarget.value);
                }}
              />
              <div>
                <LabelWithHint htmlFor={phoneId} label="Teléfono (opcional)" hint={PHONE_HINT} />
                <PhoneField
                  id={phoneId}
                  label="Característica del teléfono"
                  autoComplete="tel-national"
                  description={PHONE_HINT}
                  value={form.senderPhone}
                  error={errors.senderPhone}
                  onChange={(phone) => {
                    update('senderPhone', phone);
                  }}
                />
              </div>
              {!isService && (
                <NumberInput
                  label="Cantidad (opcional)"
                  min={1}
                  max={MAX_QUANTITY}
                  allowDecimal={false}
                  allowNegative={false}
                  value={form.quantity}
                  error={errors.quantity}
                  onChange={(value) => {
                    update('quantity', value);
                  }}
                />
              )}
              <Textarea
                label="Mensaje"
                required
                rows={4}
                maxLength={MAX_MESSAGE}
                value={form.message}
                error={errors.message}
                onChange={(event) => {
                  update('message', event.currentTarget.value);
                }}
              />
              <Group justify="flex-end" mt={-12}>
                <CharacterCount length={form.message.length} max={MAX_MESSAGE} />
              </Group>
              {formError && (
                <Alert role="alert" color="red" icon={<IconAlertCircle aria-hidden />}>
                  {formError}
                </Alert>
              )}
              <Button
                type="submit"
                h={48}
                loading={send.isPending}
                style={{ alignSelf: 'flex-start' }}
              >
                Enviar consulta
              </Button>
            </Stack>
          </form>
        )}
      </Stack>
    </AppModal>
  );
}
