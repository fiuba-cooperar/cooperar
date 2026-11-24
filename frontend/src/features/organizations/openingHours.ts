import { OpeningDay, type OpeningPeriodResponse } from '@/api/generated/model';

/** The days of the week in order, which is also the order they are shown in. */
export const WEEK: OpeningDay[] = [
  OpeningDay.MONDAY,
  OpeningDay.TUESDAY,
  OpeningDay.WEDNESDAY,
  OpeningDay.THURSDAY,
  OpeningDay.FRIDAY,
  OpeningDay.SATURDAY,
  OpeningDay.SUNDAY,
];

/** What the hours are set for: each day of the week, and the public holidays as one more. */
export const ROWS: OpeningDay[] = [...WEEK, OpeningDay.HOLIDAY];

export const DAY_LABELS: Record<OpeningDay, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
  HOLIDAY: 'Feriados',
};

export interface OpeningHoursRow {
  /** "Lunes a viernes", "Sábado"… */
  days: string;
  /** "8:00 a 12:00 y 14:00 a 18:00" */
  hours: string;
}

/** "08:00" shows as "8:00". */
function shortTime(time: string): string {
  return time.replace(/^0(?=\d)/, '');
}

function daysLabel(days: OpeningDay[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (first === undefined || last === undefined) return '';
  if (days.length === 1) return DAY_LABELS[first];
  if (days.length === 2) return `${DAY_LABELS[first]} y ${DAY_LABELS[last].toLowerCase()}`;
  return `${DAY_LABELS[first]} a ${DAY_LABELS[last].toLowerCase()}`;
}

/** The schedule as lines for people: consecutive days with the same hours go together ("Lunes a viernes"). */
export function formatOpeningHours(periods: OpeningPeriodResponse[]): OpeningHoursRow[] {
  const hoursOf = (day: OpeningDay) =>
    periods
      .filter((period) => period.day === day)
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt))
      .map(({ opensAt, closesAt }) =>
        opensAt === '00:00' && closesAt === '23:59'
          ? '24 horas'
          : `${shortTime(opensAt)} a ${shortTime(closesAt)}`,
      )
      .join(' y ');

  const rows: { days: OpeningDay[]; hours: string }[] = [];
  for (const day of WEEK) {
    const hours = hoursOf(day);
    if (!hours) continue;
    const previous = rows[rows.length - 1];
    const previousDay = previous?.days[previous.days.length - 1];
    const follows =
      previousDay !== undefined && WEEK.indexOf(previousDay) === WEEK.indexOf(day) - 1;
    if (previous && follows && previous.hours === hours) previous.days.push(day);
    else rows.push({ days: [day], hours });
  }
  const holidays = hoursOf(OpeningDay.HOLIDAY);
  if (holidays) rows.push({ days: [OpeningDay.HOLIDAY], hours: holidays });
  return rows.map(({ days, hours }) => ({ days: daysLabel(days), hours }));
}
