import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getListNotificationsQueryKey,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/generated/notifications/notifications';
import type { NotificationResponse } from '@/api/generated/model';

/** A page of notifications; the generated type marks every field optional. */
export interface NotificationsPage {
  items: NotificationResponse[];
  total: number;
  unread: number;
}

/** How many the home shows; the rest are in the notification center. */
export const LATEST_NOTIFICATIONS = 5;

interface Filter {
  unread: boolean;
  page: number;
  size: number;
}

async function fetchPage({ unread: onlyUnread, page, size }: Filter): Promise<NotificationsPage> {
  const response = await listNotifications({ unread: onlyUnread, page, size });
  const httpStatus: number = response.status;
  if (httpStatus !== 200) throw new Error(`Unexpected status ${String(httpStatus)}`);
  const { items, total, unread } = response.data;
  return { items: items ?? [], total: total ?? 0, unread: unread ?? 0 };
}

/** A page of the notifications of the account, newest first, with how many it has unread in all. */
export function useNotifications(filter: Filter) {
  return useQuery({
    queryKey: getListNotificationsQueryKey({ ...filter }),
    queryFn: () => fetchPage(filter),
    // What happened since the last visit is the point of the page.
    refetchOnMount: 'always',
  });
}

/** Every list of notifications, whatever its page or filter, shares this prefix. */
function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
}

async function ensureNoContent(call: Promise<{ status: number }>) {
  const { status } = await call;
  if (status !== 204) throw new Error(`Unexpected status ${String(status)}`);
}

export function useMarkNotificationRead() {
  const refresh = useRefreshNotifications();
  return useMutation({
    mutationFn: (id: string) => ensureNoContent(markNotificationRead(id)),
    onSuccess: refresh,
  });
}

export function useMarkAllNotificationsRead() {
  const refresh = useRefreshNotifications();
  return useMutation({
    mutationFn: () => ensureNoContent(markAllNotificationsRead()),
    onSuccess: refresh,
  });
}
