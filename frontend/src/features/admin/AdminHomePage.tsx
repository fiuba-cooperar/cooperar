import { Stack, Text, Title } from '@mantine/core';

export function AdminHomePage() {
  return (
    <Stack gap="sm">
      <Title order={1}>Panel del observatorio</Title>
      <Text>Desde acá vas a administrar las altas, los relevamientos y los contenidos.</Text>
    </Stack>
  );
}
