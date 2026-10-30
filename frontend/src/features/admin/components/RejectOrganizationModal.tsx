import { Button, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { useState, type SyntheticEvent } from 'react';

const MAX_REASON_LENGTH = 1000;

/** Asks for the reason of a rejection, which the account that registered the organization gets to see. */
export function RejectOrganizationModal({
  organizationName,
  opened,
  submitting,
  onClose,
  onConfirm,
}: {
  organizationName: string;
  opened: boolean;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setError('Escribí el motivo del rechazo.');
      return;
    }
    onConfirm(reason.trim());
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`Rechazar el alta de ${organizationName}`}>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          <Text size="sm">
            La cuenta que registró la organización va a ver este motivo en su panel y en el email
            que le enviamos.
          </Text>
          <Textarea
            label="Motivo"
            required
            rows={4}
            maxLength={MAX_REASON_LENGTH}
            value={reason}
            error={error}
            onChange={(event) => {
              setReason(event.currentTarget.value);
              setError(null);
            }}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" color="red" loading={submitting}>
              Rechazar el alta
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
