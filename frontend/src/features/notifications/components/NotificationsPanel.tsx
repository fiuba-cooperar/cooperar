import { ActionIcon, Badge, Button, Text, Tooltip } from '@mantine/core';
import { IconBell, IconChecks } from '@tabler/icons-react';
import { Link } from 'react-router';
import { ACCOUNT_NOTIFICATIONS_PATH } from '@/features/account/accountSections';
import { Panel } from '@/features/account/components/Panel';
import {
  LATEST_NOTIFICATIONS,
  useMarkAllNotificationsRead,
  useNotifications,
} from '../api/useNotifications';
import { NotificationList } from './NotificationList';

/** The latest notifications of the account, with the way to mark them all as read and to see the whole history. */
export function NotificationsPanel() {
  const notifications = useNotifications({ unread: false, page: 0, size: LATEST_NOTIFICATIONS });
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications.data?.unread ?? 0;

  return (
    <Panel
      id="notifications-heading"
      icon={<IconBell size={17} aria-hidden />}
      title="Notificaciones"
      badge={
        unread > 0 ? (
          <Badge color="orange" variant="light" size="lg" aria-label={`${String(unread)} sin leer`}>
            {unread}
          </Badge>
        ) : undefined
      }
      actions={
        unread > 0 ? (
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
        ) : undefined
      }
    >
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
        <>
          <NotificationList items={notifications.data.items} />
          <Button
            component={Link}
            to={ACCOUNT_NOTIFICATIONS_PATH}
            variant="default"
            h={44}
            mt="md"
            fullWidth
          >
            Ver todas las notificaciones
          </Button>
        </>
      )}
    </Panel>
  );
}
