import { Avatar, Button, Group, Text } from '@mantine/core';
import { IconLogout } from '@tabler/icons-react';
import { useAuth } from '@/features/auth/useAuth';
import { displayName, initials } from '@/features/auth/userName';
import styles from './PanelAccount.module.css';

/** Signed-in person of a panel (name and sign-out), shared by the admin and cooperative headers. */
export function PanelAccount() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <Group gap={12} wrap="nowrap">
      <Avatar variant="filled" size={36} fz={14} fw={700} className={styles.avatar} aria-hidden>
        {initials(user)}
      </Avatar>
      <Text fw={600} fz={15} truncate="end" maw={{ base: 160, md: 280 }}>
        {displayName(user)}
      </Text>
      <Button
        variant="default"
        h={44}
        px="md"
        fz={15}
        fw={600}
        leftSection={<IconLogout size={18} stroke={1.9} aria-hidden />}
        onClick={() => void logout()}
      >
        Cerrar sesión
      </Button>
    </Group>
  );
}
