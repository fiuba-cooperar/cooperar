import { Stack, Text, Title } from '@mantine/core';
import { SystemStatus } from '@/features/health/components/SystemStatus';

export function HomePage() {
  return (
    <Stack gap="xl">
      <Stack gap="sm">
        <Title order={1} fz={{ base: 32, sm: 48 }}>
          CooperAR
        </Title>
        <Text size="lg" c="dimmed" maw={600}>
          Observatorio abierto de empresas recuperadas por sus trabajadores y cooperativas de
          trabajo.
        </Text>
      </Stack>
      <SystemStatus />
    </Stack>
  );
}
