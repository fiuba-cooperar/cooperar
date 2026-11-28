import { describe, expect, it } from 'vitest';
import {
  emptyWeek,
  periodsFromWeek,
  weekFromPeriods,
  weekProblems,
  withoutEmptyRanges,
  type TimeRange,
  type WeekHours,
} from './openingHoursForm';

function monday(...ranges: [string, string][]): WeekHours {
  return {
    ...emptyWeek(),
    MONDAY: ranges.map(([opensAt, closesAt]): TimeRange => ({ opensAt, closesAt })),
  };
}

describe('weekProblems', () => {
  it('accepts split shifts that do not overlap', () => {
    expect(weekProblems(monday(['08:00', '12:00'], ['14:00', '18:00']))).toEqual({});
  });

  it('rejects a closing time before the opening one, which would be the next day', () => {
    expect(weekProblems(monday(['09:00', '08:00'])).MONDAY).toBe(
      'La hora de cierre tiene que ser posterior a la de apertura.',
    );
  });

  it('rejects ranges of a day that overlap', () => {
    expect(weekProblems(monday(['08:00', '13:00'], ['12:00', '18:00'])).MONDAY).toBe(
      'Los horarios de este día se superponen.',
    );
  });

  it('asks to finish a range left half written, but not while it is being written', () => {
    const week = monday(['08:00', '13:00'], ['14:00', '']);

    expect(weekProblems(week).MONDAY).toBe('Completá la hora de apertura y la de cierre.');
    expect(weekProblems(week, true)).toEqual({});
  });
});

describe('withoutEmptyRanges', () => {
  it('drops the ranges added and left empty, but keeps a day with only an empty one', () => {
    const week = {
      ...monday(['08:00', '12:00'], ['', ''], ['', '']),
      TUESDAY: [{ opensAt: '', closesAt: '' }],
    };

    const cleaned = withoutEmptyRanges(week);

    expect(cleaned.MONDAY).toEqual([{ opensAt: '08:00', closesAt: '12:00' }]);
    expect(cleaned.TUESDAY).toEqual([{ opensAt: '', closesAt: '' }]);
  });
});

describe('periods', () => {
  it('goes from the periods of the API to the week and back, each day in order', () => {
    const week = weekFromPeriods([
      { day: 'MONDAY', opensAt: '14:00', closesAt: '18:00' },
      { day: 'MONDAY', opensAt: '08:00', closesAt: '12:00' },
    ]);

    expect(week.MONDAY.map(({ opensAt }) => opensAt)).toEqual(['08:00', '14:00']);
    expect(periodsFromWeek(week)).toEqual([
      { day: 'MONDAY', opensAt: '08:00', closesAt: '12:00' },
      { day: 'MONDAY', opensAt: '14:00', closesAt: '18:00' },
    ]);
  });
});
