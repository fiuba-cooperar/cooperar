import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';
import { ROLE_HOME } from '@/features/auth/roleHome';
import { useAuth } from '@/features/auth/useAuth';

export function ForbiddenPage() {
  const { user } = useAuth();

  return (
    <Stack gap="sm">
      <Title order={1}>Acceso denegado</Title>
      <Text>No tenés permiso para ver esta sección.</Text>
      {user ? (
        <Anchor component={Link} to={ROLE_HOME[user.role]}>
          Ir a mi sección
        </Anchor>
      ) : (
        <Anchor component={Link} to="/">
          Volver al inicio
        </Anchor>
      )}
    </Stack>
  );
}
