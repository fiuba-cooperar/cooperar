import type { NotificationResponse } from '@/api/generated/model';
import { NotificationItem } from './NotificationItem';
import styles from './NotificationList.module.css';

export function NotificationList({ items }: { items: NotificationResponse[] }) {
  return (
    <ul className={styles.list}>
      {items.map((notification) => (
        <li key={notification.id} className={styles.item}>
          <NotificationItem notification={notification} />
        </li>
      ))}
    </ul>
  );
}
