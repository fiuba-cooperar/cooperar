const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
const time = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const shortDate = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' });

/**
 * When something happened, as short as it reads in the bell: "recién" and "hace 5 min" within the hour, the time
 * today and yesterday ("hoy, 14:30", "ayer, 18:05"), "hace 3 días" within a week, and the day and month after that.
 */
export function shortWhen(at: Date, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / MINUTE);
  if (minutes < 1) return 'recién';
  if (minutes < 60) return `hace ${String(minutes)} min`;
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(at).setHours(0, 0, 0, 0)) / DAY,
  );
  if (days <= 1) return `${relative.format(-days, 'day')}, ${time.format(at)}`;
  return days < 7 ? relative.format(-days, 'day') : shortDate.format(at);
}
