import { List, Stack, Text, Title } from '@mantine/core';
import { useAuth } from '@/features/auth/useAuth';

export function CooperativeHomePage() {
  const { user } = useAuth();
  const cooperatives = user?.cooperatives ?? [];

  return (
    <Stack gap="sm">
      <Title order={1}>Mi cooperativa</Title>
      {cooperatives.length > 0 ? (
        <List>
          {cooperatives.map((cooperative) => (
            <List.Item key={cooperative.id}>{cooperative.name}</List.Item>
          ))}
        </List>
      ) : (
        <Text>Todavía no tenés ninguna cooperativa asociada a tu cuenta.</Text>
      )}
    </Stack>
  );
}
