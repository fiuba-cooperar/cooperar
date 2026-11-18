import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useState, type SyntheticEvent } from 'react';

const MAX_MESSAGE_LENGTH = 1000;

/**
 * Asks for the message that goes with a rejection or a request for changes, which the account that registered the
 * organization gets to see.
 */
export function ReviewMessageModal({
  title,
  description,
  label,
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
    <Modal opened onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          <Text size="sm">{description}</Text>
          <Textarea
            label={label}
            required
            rows={4}
            maxLength={MAX_MESSAGE_LENGTH}
            value={message}
            error={error}
            onChange={(event) => {
              setMessage(event.currentTarget.value);
              setError(null);
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={submitting}
              {...(confirmColor && { color: confirmColor })}
            >
              {confirmLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
