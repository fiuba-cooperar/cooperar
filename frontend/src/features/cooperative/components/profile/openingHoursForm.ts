import type {
  OpeningDay,
  OpeningPeriodRequest,
  OpeningPeriodResponse,
} from '@/api/generated/model';
import { ROWS } from '@/features/organizations/openingHours';

export interface TimeRange {
  /** "HH:mm", or empty while the person has not picked it. */
  opensAt: string;
  closesAt: string;
}

/** The ranges of each day; a day with none is closed. */
export type WeekHours = Record<OpeningDay, TimeRange[]>;

export const MAX_RANGES_PER_DAY = 3;
export const DEFAULT_RANGE: TimeRange = { opensAt: '09:00', closesAt: '18:00' };

export function emptyWeek(): WeekHours {
  return {
    MONDAY: [],
    TUESDAY: [],
    WEDNESDAY: [],
    THURSDAY: [],
    FRIDAY: [],
    SATURDAY: [],
    SUNDAY: [],
    HOLIDAY: [],
  };
}

export function weekFromPeriods(periods: OpeningPeriodResponse[]): WeekHours {
  const week = emptyWeek();
  for (const { day, opensAt, closesAt } of periods) week[day].push({ opensAt, closesAt });
  for (const day of ROWS) week[day].sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  return week;
}

export function periodsFromWeek(week: WeekHours): OpeningPeriodRequest[] {
  return ROWS.flatMap((day) =>
    week[day].map(({ opensAt, closesAt }) => ({ day, opensAt, closesAt })),
  );
}

export type WeekErrors = Partial<Record<OpeningDay, string>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/**
 * What is wrong with each day, if anything. A range closes the same day it opens, so a closing time before the opening
 * one is rejected: 01:00 after 09:00 would be the next day. With `typing`, the ranges still being written are left
 * alone and only the ones that are complete are judged, to tell the person as soon as one is wrong.
 */
export function weekProblems(week: WeekHours, typing = false): WeekErrors {
  const errors: WeekErrors = {};
  for (const day of ROWS) {
    const ranges = week[day];
    const valid = ranges.filter(
      ({ opensAt, closesAt }) => TIME.test(opensAt) && TIME.test(closesAt),
    );
    if (!typing && ranges.some(({ opensAt, closesAt }) => !opensAt || !closesAt)) {
      errors[day] = 'Completá la hora de apertura y la de cierre.';
    } else if (!typing && valid.length < ranges.length) {
      errors[day] = 'Escribí las horas con el formato de 24 horas, por ejemplo 08:00.';
    } else if (valid.some(({ opensAt, closesAt }) => opensAt >= closesAt)) {
      errors[day] = 'La hora de cierre tiene que ser posterior a la de apertura.';
    } else {
      const sorted = [...valid].sort((a, b) => a.opensAt.localeCompare(b.opensAt));
      const overlaps = sorted.some((range, index) => {
        const previous = sorted[index - 1];
        return previous !== undefined && range.opensAt < previous.closesAt;
      });
      if (overlaps) errors[day] = 'Los horarios de este día se superponen.';
    }
  }
  return errors;
}

/** The errors found when saving, with the ones found while typing; a day cleared of one keeps the other. */
export function withTypingProblems(saved: WeekErrors, week: WeekHours): WeekErrors {
  const merged = weekProblems(week, true);
  for (const day of ROWS) {
    const problem = saved[day];
    if (problem) merged[day] = problem;
  }
  return merged;
}

/**
 * The week without the ranges that were added and left empty, as long as the day keeps another one: a day with
 * only an empty range keeps it, so it is flagged instead of silently closing.
 */
export function withoutEmptyRanges(week: WeekHours): WeekHours {
  const cleaned = { ...week };
  for (const day of ROWS) {
    const filled = week[day].filter(({ opensAt, closesAt }) => opensAt !== '' || closesAt !== '');
    if (filled.length > 0) cleaned[day] = filled;
  }
  return cleaned;
}
