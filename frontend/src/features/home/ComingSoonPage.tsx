import { Anchor, Badge, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router';

/** Placeholder for a section that does not exist yet; `homePath` is where "Volver al inicio" goes. */
export function ComingSoonPage({ title, homePath = '/' }: { title: string; homePath?: string }) {
  return (
    <Stack gap="sm" align="flex-start">
      <Badge variant="light" size="lg">
        Próximamente
      </Badge>
      <Title order={1}>{title}</Title>
      <Text>
        Estamos armando esta sección y muy pronto vas a poder usarla.{' '}
        <Anchor component={Link} to={homePath}>
          Volver al inicio
        </Anchor>
      </Text>
    </Stack>
  );
}
