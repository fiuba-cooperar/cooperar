import { Alert, Button, Stack } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconKey } from '@tabler/icons-react';
import { useState } from 'react';
import type { AdminUserDetailResponse } from '@/api/generated/model';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useResetUserPassword } from '../api/useResetUserPassword';
import { fullName } from '../users';

/**
 * «Blanquear contraseña»: the current password stops working and the account is emailed a link to choose a new one.
 * The observatory never sees nor chooses it.
 */
export function PasswordResetAction({ user }: { user: AdminUserDetailResponse }) {
  const [confirming, setConfirming] = useState(false);
  const reset = useResetUserPassword();
  const name = fullName(user) || user.email;

  return (
    <Stack gap="sm" align="flex-start">
      {reset.isSuccess && (
        <Alert color="brand" icon={<IconCircleCheck aria-hidden />} role="status" w="100%">
          Le mandamos a {user.email} el enlace para elegir una contraseña nueva.
        </Alert>
      )}
      {reset.isError && (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert" w="100%">
          No pudimos blanquear la contraseña. Intentá de nuevo en unos minutos.
        </Alert>
      )}
      <Button
        variant="default"
        leftSection={<IconKey size={18} aria-hidden />}
        onClick={() => {
          setConfirming(true);
        }}
      >
        Blanquear contraseña
      </Button>
      <ConfirmDialog
        opened={confirming}
        title={`¿Blanquear la contraseña de ${name}?`}
        icon={<IconKey size={20} />}
        confirmLabel="Blanquear contraseña"
        loading={reset.isPending}
        onClose={() => {
          setConfirming(false);
        }}
        onConfirm={() => {
          reset.mutate(user.id, {
            onSettled: () => {
              setConfirming(false);
            },
          });
        }}
      >
        La contraseña actual deja de funcionar y se cierran sus sesiones abiertas. Le mandamos a{' '}
        {user.email} un enlace para elegir una nueva, que vence en 48 horas.
      </ConfirmDialog>
    </Stack>
  );
}
