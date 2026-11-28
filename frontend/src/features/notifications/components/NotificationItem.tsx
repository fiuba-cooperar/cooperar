import { ActionIcon, Badge, Button, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconMessage,
} from '@tabler/icons-react';
import { Link } from 'react-router';
import type { NotificationResponse } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { notificationContent, type NotificationTone } from '../notificationContent';
import { useMarkNotificationRead } from '../api/useNotifications';
import { NotificationTime } from './NotificationTime';

export const NOTIFICATION_ICONS: Record<NotificationTone, typeof IconCircleCheck> = {
  blue: IconMessage,
  green: IconCircleCheck,
  orange: IconAlertTriangle,
  red: IconCircleX,
};

/** One notification: what happened, when, where to go about it and, while unread, a way to mark it as read. */
export function NotificationItem({ notification }: { notification: NotificationResponse }) {
  const { user } = useAuth();
  const content = notificationContent(notification, user?.organizations);
  const markRead = useMarkNotificationRead();
  const unread = !notification.readAt;
  const Icon = NOTIFICATION_ICONS[content.tone];
  const id = notification.id ?? '';

  return (
    <Group gap="sm" wrap="nowrap" align="flex-start">
      <ThemeIcon
        variant="light"
        color={unread ? content.tone : 'gray'}
        size={28}
        radius="md"
        aria-hidden
      >
        <Icon size={16} />
      </ThemeIcon>
      <Stack gap={4} miw={0} style={{ flex: 1 }}>
        <Group gap="xs" wrap="nowrap" justify="space-between" align="flex-start">
          <Text size="sm" fw={unread ? 700 : 500} {...(unread ? {} : { c: 'dimmed' })}>
            {content.title}
          </Text>
          {unread && (
            <Badge color="brand" variant="filled" size="xs" style={{ flexShrink: 0 }}>
              Nueva
            </Badge>
          )}
        </Group>
        {content.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {content.description}
          </Text>
        )}
        <Group gap="xs" mt={2}>
          <Button
            component={Link}
            to={content.to}
            {...(content.organizationId
              ? { state: { organizationId: content.organizationId } }
              : {})}
            size="compact-sm"
            variant={unread ? 'filled' : 'default'}
            onClick={() => {
              if (unread) markRead.mutate(id);
            }}
          >
            {content.actionLabel}
          </Button>
          {unread && (
            <Tooltip label="Marcar como leída">
              <ActionIcon
                variant="subtle"
                color="brand"
                size={28}
                loading={markRead.isPending}
                aria-label={`Marcar como leída: ${content.title}`}
                onClick={() => {
                  markRead.mutate(id);
                }}
              >
                <IconCheck size={18} aria-hidden />
              </ActionIcon>
            </Tooltip>
          )}
          {notification.createdAt && <NotificationTime at={notification.createdAt} ml="auto" />}
        </Group>
      </Stack>
    </Group>
  );
}
