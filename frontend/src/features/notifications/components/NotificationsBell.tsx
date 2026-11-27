import { ActionIcon, Button, Group, Indicator, Popover, Text, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconBell, IconChecks } from '@tabler/icons-react';
import { useId } from 'react';
import { Link } from 'react-router';
import { ACCOUNT_NOTIFICATIONS_PATH } from '@/features/account/accountSections';
import { useLatestNotifications, useMarkAllNotificationsRead } from '../api/useNotifications';
import { NotificationRow } from './NotificationRow';
import styles from './NotificationsBell.module.css';

/**
 * The bell of the header: how many notifications are unread and, when opened, the latest ones with the way to mark them
 * all as read and to see the whole history. Following a link inside closes it.
 */
export function NotificationsBell() {
  const [opened, popover] = useDisclosure(false);
  const titleId = useId();
  const notifications = useLatestNotifications();
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications.data?.unread ?? 0;
  const label = unread === 0 ? 'Notificaciones' : `Notificaciones, ${String(unread)} sin leer`;

  return (
    <Indicator
      label={unread > 9 ? '9+' : unread}
      size={18}
      color="orange"
      offset={6}
      disabled={unread === 0}
    >
      <Popover
        opened={opened}
        onChange={(value) => {
          if (!value) popover.close();
        }}
        position="bottom-end"
        width={380}
        shadow="md"
        radius="md"
        trapFocus
        returnFocus
      >
        <Popover.Target>
          <ActionIcon
            variant="subtle"
            color="gray"
            size={44}
            radius="xl"
            aria-label={label}
            onClick={popover.toggle}
          >
            <IconBell size={22} stroke={1.8} aria-hidden />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown
          p="md"
          aria-labelledby={titleId}
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a')) popover.close();
          }}
        >
          <Group justify="space-between" mb="sm">
            <Text id={titleId} fw={700}>
              Notificaciones
            </Text>
            {unread > 0 && (
              <Tooltip label="Marcar todas como leídas">
                <ActionIcon
                  variant="subtle"
                  color="brand"
                  size={32}
                  loading={markAll.isPending}
                  aria-label="Marcar todas como leídas"
                  onClick={() => {
                    markAll.mutate();
                  }}
                >
                  <IconChecks size={20} aria-hidden />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          {notifications.isPending ? (
            <Text c="dimmed" size="sm" role="status">
              Cargando notificaciones…
            </Text>
          ) : notifications.isError ? (
            <Text c="red" size="sm" role="alert">
              No pudimos cargar tus notificaciones.
            </Text>
          ) : notifications.data.items.length === 0 ? (
            <Text c="dimmed" size="sm">
              No tenés notificaciones por ahora.
            </Text>
          ) : (
            <ul className={styles.list}>
              {notifications.data.items.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow notification={notification} />
                </li>
              ))}
            </ul>
          )}
          <Button
            component={Link}
            to={ACCOUNT_NOTIFICATIONS_PATH}
            variant="default"
            h={40}
            mt="md"
            fullWidth
          >
            Ver todas las notificaciones
          </Button>
        </Popover.Dropdown>
      </Popover>
    </Indicator>
  );
}
