import { List, Stack, Text, Title } from '@mantine/core';
import { useAuth } from '@/features/auth/useAuth';

export function CooperativeHomePage() {
  const { user } = useAuth();
  const organizations = user?.organizations ?? [];

  return (
    <Stack gap="sm">
      <Title order={1}>Mi organización</Title>
      {organizations.length > 0 ? (
        <List>
          {organizations.map((organization) => (
            <List.Item key={organization.id}>{organization.name}</List.Item>
          ))}
        </List>
      ) : (
        <Text>Todavía no tenés ninguna organización asociada a tu cuenta.</Text>
      )}
    </Stack>
  );
}
