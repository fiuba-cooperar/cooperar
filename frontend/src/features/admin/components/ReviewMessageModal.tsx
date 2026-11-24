import { Button, Group, Stack, Text, Textarea } from '@mantine/core';
import { useState, type SyntheticEvent } from 'react';
import { AppModal } from '@/components/AppModal';

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Asks for the message that goes with a rejection or a request for changes, which the account that registered the
 * organization gets to see.
 */
export function ReviewMessageModal({
  title,
  description,
  label,
  placeholder,
  missingMessage,
  confirmLabel,
  confirmColor,
  submitting,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  label: string;
  placeholder?: string;
  missingMessage: string;
  confirmLabel: string;
  confirmColor?: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError(missingMessage);
      return;
    }
    onConfirm(message.trim());
  }

  return (
    <AppModal opened onClose={onClose} title={title} size="lg">
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {description}
          </Text>
          <Textarea
            label={label}
            required
            rows={5}
            {...(placeholder && { placeholder })}
            description={`${String(message.length)} de ${String(MAX_MESSAGE_LENGTH)} caracteres`}
            descriptionProps={{ 'aria-live': 'off' }}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            error={error}
            onChange={(event) => {
              setMessage(event.currentTarget.value);
              setError(null);
            }}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" h={44} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              h={44}
              loading={submitting}
              {...(confirmColor && { color: confirmColor })}
            >
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </AppModal>
  );
}
