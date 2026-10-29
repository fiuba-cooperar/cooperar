import { Anchor, Badge, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <Stack gap="sm" align="flex-start">
      <Badge variant="light" size="lg">
        Próximamente
      </Badge>
      <Title order={1}>{title}</Title>
      <Text>
        Estamos armando esta sección y muy pronto vas a poder usarla.{' '}
        <Anchor component={Link} to="/">
          Volver al inicio
        </Anchor>
      </Text>
    </Stack>
  );
}
