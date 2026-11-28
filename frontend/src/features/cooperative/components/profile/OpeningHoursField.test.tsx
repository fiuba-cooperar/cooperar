import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { theme } from '@/app/theme';
import { OpeningHoursField } from './OpeningHoursField';
import { emptyWeek, weekProblems, type WeekHours } from './openingHoursForm';

// The field alone, without the profile around it: the dialog and the saving are tested with the contact section.
function Week({ initial }: { initial: WeekHours }) {
  const [week, setWeek] = useState(initial);
  return (
    <OpeningHoursField
      value={week}
      errors={weekProblems(week, true)}
      onChange={(day, ranges) => {
        setWeek((current) => ({ ...current, [day]: ranges }));
      }}
    />
  );
}

function renderWeek(initial: Partial<WeekHours> = {}) {
  render(
    <MantineProvider theme={theme} env="test">
      <Week initial={{ ...emptyWeek(), ...initial }} />
    </MantineProvider>,
  );
}

const MORNING_AND_AFTERNOON = [
  { opensAt: '08:00', closesAt: '12:00' },
  { opensAt: '14:00', closesAt: '18:00' },
];

describe('OpeningHoursField', () => {
  it('lists the seven days and the public holidays, all closed until one is opened', async () => {
    renderWeek();

    expect(screen.getAllByRole('switch')).toHaveLength(8);
    expect(
      screen.getAllByRole('switch').filter((day) => (day as HTMLInputElement).checked),
    ).toEqual([]);
    await userEvent.click(screen.getByRole('switch', { name: 'Lunes' }));

    expect(screen.getByRole('combobox', { name: 'Lunes, apertura' })).toHaveValue('09:00');
    expect(screen.getByRole('combobox', { name: 'Lunes, cierre' })).toHaveValue('18:00');
  });

  it('opens a day with the hours of the day before', async () => {
    renderWeek({ MONDAY: MORNING_AND_AFTERNOON });

    await userEvent.click(screen.getByRole('switch', { name: 'Martes' }));

    expect(screen.getByRole('combobox', { name: 'Martes, franja 1, apertura' })).toHaveValue(
      '08:00',
    );
    expect(screen.getByRole('combobox', { name: 'Martes, franja 2, cierre' })).toHaveValue('18:00');
  });

  it('adds a range to a day and removes it', async () => {
    renderWeek({ MONDAY: MORNING_AND_AFTERNOON });

    await userEvent.click(screen.getByRole('button', { name: 'Agregar una franja el lunes' }));
    expect(screen.getByRole('combobox', { name: 'Lunes, franja 3, apertura' })).toHaveValue('');
    // Up to three ranges a day.
    expect(
      screen.queryByRole('button', { name: 'Agregar una franja el lunes' }),
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Quitar lunes, franja 3' }));

    expect(
      screen.queryByRole('combobox', { name: 'Lunes, franja 3, apertura' }),
    ).not.toBeInTheDocument();
  });

  it('copies the hours of a day to the days picked', async () => {
    renderWeek({ MONDAY: MORNING_AND_AFTERNOON });

    await userEvent.click(
      screen.getByRole('button', { name: 'Copiar el horario del lunes a otros días' }),
    );
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Miércoles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(
      await screen.findByRole('combobox', { name: 'Miércoles, franja 2, cierre' }),
    ).toHaveValue('18:00');
    expect(screen.getByRole('switch', { name: 'Martes' })).not.toBeChecked();
  });

  it('only offers the quarters of an hour, and the end of the day to close', async () => {
    renderWeek({ MONDAY: [{ opensAt: '09:00', closesAt: '18:00' }] });

    await userEvent.click(screen.getByRole('combobox', { name: 'Lunes, apertura' }));
    expect(await screen.findByRole('option', { name: '08:45' })).toBeVisible();
    expect(screen.queryByRole('option', { name: '08:40' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '23:59' })).not.toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('combobox', { name: 'Lunes, cierre' }));

    expect(await screen.findByRole('option', { name: '23:59' })).toBeVisible();
  });

  it('shows the problem of a day as soon as its hours are complete', () => {
    renderWeek({ MONDAY: [{ opensAt: '09:00', closesAt: '08:00' }] });

    expect(
      screen.getByText('La hora de cierre tiene que ser posterior a la de apertura.'),
    ).toBeVisible();
  });
});
