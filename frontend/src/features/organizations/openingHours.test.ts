import { describe, expect, it } from 'vitest';
import type { OpeningPeriodResponse } from '@/api/generated/model';
import { formatOpeningHours } from './openingHours';

function period(day: OpeningPeriodResponse['day'], opensAt: string, closesAt: string) {
  return { day, opensAt, closesAt };
}

describe('formatOpeningHours', () => {
  it('groups the consecutive days that have the same hours', () => {
    expect(
      formatOpeningHours([
        period('MONDAY', '08:00', '17:00'),
        period('TUESDAY', '08:00', '17:00'),
        period('WEDNESDAY', '08:00', '17:00'),
        period('SATURDAY', '09:00', '13:00'),
      ]),
    ).toEqual([
      { days: 'Lunes a miércoles', hours: '8:00 a 17:00' },
      { days: 'Sábado', hours: '9:00 a 13:00' },
    ]);
  });

  it('names two days with "y" and keeps the days that are not consecutive apart', () => {
    expect(
      formatOpeningHours([
        period('MONDAY', '08:00', '17:00'),
        period('TUESDAY', '08:00', '17:00'),
        period('THURSDAY', '08:00', '17:00'),
      ]),
    ).toEqual([
      { days: 'Lunes y martes', hours: '8:00 a 17:00' },
      { days: 'Jueves', hours: '8:00 a 17:00' },
    ]);
  });

  it('lists the ranges of a day in order, whatever order they arrive in', () => {
    expect(
      formatOpeningHours([period('FRIDAY', '15:00', '18:00'), period('FRIDAY', '08:00', '12:00')]),
    ).toEqual([{ days: 'Viernes', hours: '8:00 a 12:00 y 15:00 a 18:00' }]);
  });

  it('says nothing when the organization is never open', () => {
    expect(formatOpeningHours([])).toEqual([]);
  });

  it('writes 00:00 to 23:59 as 24 hours and lists the public holidays last, on their own', () => {
    expect(
      formatOpeningHours([
        period('HOLIDAY', '09:00', '13:00'),
        period('MONDAY', '00:00', '23:59'),
        period('TUESDAY', '00:00', '23:59'),
        period('SUNDAY', '09:00', '13:00'),
      ]),
    ).toEqual([
      { days: 'Lunes y martes', hours: '24 horas' },
      { days: 'Domingo', hours: '9:00 a 13:00' },
      { days: 'Feriados', hours: '9:00 a 13:00' },
    ]);
  });
});
