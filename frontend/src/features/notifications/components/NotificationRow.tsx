import { Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { Link } from 'react-router';
import type { NotificationResponse } from '@/api/generated/model';
import { useAuth } from '@/features/auth/useAuth';
import { useMarkNotificationRead } from '../api/useNotifications';
import { notificationContent } from '../notificationContent';
import { NOTIFICATION_ICONS } from './NotificationItem';
import { NotificationTime } from './NotificationTime';
import styles from './NotificationRow.module.css';

/**
 * A notification in one row, for the bell: the whole row leads where the notification points and marks it as read.
 * The message and the other actions are in the notification center.
 */
export function NotificationRow({ notification }: { notification: NotificationResponse }) {
  const { user } = useAuth();
  const content = notificationContent(notification, user?.organizations);
  const markRead = useMarkNotificationRead();
  const unread = !notification.readAt;
  const Icon = NOTIFICATION_ICONS[content.tone];

  return (
    <UnstyledButton
      component={Link}
      to={content.to}
      {...(content.organizationId ? { state: { organizationId: content.organizationId } } : {})}
      className={styles.row}
      data-unread={unread || undefined}
      onClick={() => {
        if (unread && notification.id) markRead.mutate(notification.id);
      }}
    >
      <ThemeIcon
        variant="light"
        color={unread ? content.tone : 'gray'}
        size={28}
        radius="md"
        aria-hidden
      >
        <Icon size={16} />
      </ThemeIcon>
      <span className={styles.text}>
        <Text
          component="span"
          size="sm"
          fw={unread ? 700 : 500}
          lineClamp={2}
          className={styles.title}
        >
          {content.title}
        </Text>
        {notification.createdAt && <NotificationTime at={notification.createdAt} />}
      </span>
      {unread && (
        <span className={styles.dot}>
          <span className={styles.visuallyHidden}>Sin leer</span>
        </span>
      )}
    </UnstyledButton>
  );
}
