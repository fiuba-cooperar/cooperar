import { Alert, Button, Stack, Text } from '@mantine/core';
import { IconMailExclamation } from '@tabler/icons-react';
import { useResendVerificationEmail } from '@/features/auth/api/useEmailVerification';

/** Reminds an account that has not confirmed its email yet, and lets it ask for a new link. */
export function EmailVerificationNotice({ email }: { email: string }) {
  const resend = useResendVerificationEmail();

  return (
    <Alert
      variant="light"
      color="yellow"
      icon={<IconMailExclamation aria-hidden />}
      title="Confirmá tu email"
    >
      <Stack gap="sm" align="flex-start">
        <Text size="sm">
          Te enviamos un enlace a <strong>{email}</strong>. Hasta que lo confirmes, el observatorio
          no puede revisar el alta de tu organización.
        </Text>
        <Button
          variant="outline"
          size="sm"
          loading={resend.isPending}
          onClick={() => {
            resend.mutate();
          }}
        >
          Reenviar el email
        </Button>
        <Text size="sm" role="status">
          {resend.isSuccess &&
            'Te enviamos un enlace nuevo. Si no lo ves, revisá la carpeta de correo no deseado.'}
          {resend.isError && 'No pudimos reenviar el email. Intentá de nuevo en unos minutos.'}
        </Text>
      </Stack>
    </Alert>
  );
}
