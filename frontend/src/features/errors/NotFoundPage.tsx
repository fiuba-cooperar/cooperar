import { Anchor, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <Stack gap="sm">
      <Title order={1}>Página no encontrada</Title>
      <Text>
        La dirección que buscás no existe.{' '}
        <Anchor component={Link} to="/">
          Volver al inicio
        </Anchor>
      </Text>
    </Stack>
  );
}
