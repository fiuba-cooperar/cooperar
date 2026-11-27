import { Text } from '@mantine/core';
import { shortWhen } from '../shortWhen';

const fullDate = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'long',
  timeStyle: 'short',
  hourCycle: 'h23',
});

/** When a notification arrived, short as in the bell everywhere; the full date shows on hover. */
export function NotificationTime({ at, ml }: { at: string; ml?: 'auto' }) {
  const date = new Date(at);
  return (
    <Text
      component="time"
      dateTime={at}
      title={fullDate.format(date)}
      size="xs"
      c="dimmed"
      {...(ml && { ml })}
    >
      {shortWhen(date)}
    </Text>
  );
}
