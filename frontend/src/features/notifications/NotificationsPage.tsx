import {
  Alert,
  Button,
  Group,
  Pagination,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { useMarkAllNotificationsRead, useNotifications } from './api/useNotifications';
import { NotificationList } from './components/NotificationList';

const PAGE_SIZE = 15;
type View = 'all' | 'unread';

/** The notification center: every notification of the account, the read ones too, newest first. */
export function NotificationsPage() {
  const [view, setView] = useState<View>('all');
  const [page, setPage] = useState(1);
  const notifications = useNotifications({
    unread: view === 'unread',
    page: page - 1,
    size: PAGE_SIZE,
  });
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications.data?.unread ?? 0;
  const pages = notifications.data
    ? Math.max(1, Math.ceil(notifications.data.total / PAGE_SIZE))
    : 1;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" gap="md">
        <Stack gap={6}>
          <Title order={1}>Notificaciones</Title>
          <Text c="dimmed">Todo lo que el observatorio te comunicó, también lo que ya leíste.</Text>
        </Stack>
        <Button
          variant="default"
          h={44}
          disabled={unread === 0}
          loading={markAll.isPending}
          onClick={() => {
            markAll.mutate();
          }}
        >
          Marcar todas como leídas
        </Button>
      </Group>

      <SegmentedControl
        aria-label="Filtrar notificaciones"
        value={view}
        onChange={(value) => {
          setView(value);
          setPage(1);
        }}
        data={[
          { value: 'all', label: 'Todas' },
          { value: 'unread', label: unread > 0 ? `Sin leer (${String(unread)})` : 'Sin leer' },
        ]}
        maw={320}
      />

      {notifications.isPending ? (
        <Text role="status">Cargando notificaciones…</Text>
      ) : notifications.isError ? (
        <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
          No pudimos cargar tus notificaciones. Intentá de nuevo en unos minutos.
        </Alert>
      ) : notifications.data.items.length === 0 ? (
        <Text>
          {view === 'unread'
            ? 'No tenés notificaciones sin leer.'
            : 'Todavía no tenés notificaciones.'}
        </Text>
      ) : (
        <Paper withBorder radius="lg" p="lg">
          <NotificationList items={notifications.data.items} />
        </Paper>
      )}

      {pages > 1 && <Pagination withEdges total={pages} value={page} onChange={setPage} />}
    </Stack>
  );
}
