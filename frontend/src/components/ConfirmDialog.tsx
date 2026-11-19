import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  ThemeIcon,
  Title,
  type MantineColor,
} from '@mantine/core';
import type { ReactNode } from 'react';

interface Props {
  opened: boolean;
  title: string;
  /** What the dialog says: what will happen. */
  children: ReactNode;
  icon: ReactNode;
  confirmLabel: string;
  /** Red for what cannot be undone, the brand color for the rest. */
  color?: MantineColor;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A confirmation before something that is hard to undo: what is about to happen, and two clear ways out. */
export function ConfirmDialog({
  opened,
  title,
  children,
  icon,
  confirmLabel,
  color = 'red',
  loading = false,
  onConfirm,
  onClose,
}: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      // The title names the dialog for assistive technology; it is shown again, bigger, in the body.
      title={title}
      centered
      radius="lg"
      size={460}
      padding="xl"
      withCloseButton={false}
      // Without its header the body has no top padding of its own, and the icon would touch the edge.
      styles={{ header: { display: 'none' }, body: { paddingTop: 'var(--mantine-spacing-xl)' } }}
    >
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap" align="center">
          <ThemeIcon variant="light" color={color} size={36} radius="xl" aria-hidden>
            {icon}
          </ThemeIcon>
          <Title order={2} fz={20}>
            {title}
          </Title>
        </Group>
        <Text c="dimmed">{children}</Text>
        <Group justify="flex-end" gap="sm" pt="xs">
          <Button variant="default" h={44} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            color={color === 'red' ? 'red.8' : color}
            h={44}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
