import { Select } from '@mantine/core';

/** Every quarter of an hour of the day: the hours are set in steps of 15 minutes. */
const QUARTER_HOURS = Array.from({ length: 96 }, (_, index) => {
  const hour = String(Math.floor(index / 4)).padStart(2, '0');
  const minutes = String((index % 4) * 15).padStart(2, '0');
  return `${hour}:${minutes}`;
});

/** What a day that never closes ends at, which is not a quarter of an hour but is how "24 horas" is written. */
export const END_OF_DAY = '23:59';

/**
 * A time as "HH:mm", always in 24 hours, in steps of 15 minutes. It is a list to pick from, which can be searched by
 * typing, so a time with other minutes cannot be written: the browser's own time input shows AM and PM in some
 * languages, and a closing time like "1:00 AM" is easy to take for the same day.
 */
export function TimeField({
  label,
  value,
  error,
  closing = false,
  onChange,
}: {
  label: string;
  value: string;
  error: boolean;
  /** A closing time can also be the end of the day, to say it is open 24 hours. */
  closing?: boolean;
  onChange: (value: string) => void;
}) {
  const options = closing ? [...QUARTER_HOURS, END_OF_DAY] : QUARTER_HOURS;
  // A time that is not in the list (a schedule saved before the steps) is still shown, until it is changed.
  const data = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Select
      aria-label={label}
      placeholder="00:00"
      data={data}
      value={value || null}
      searchable
      allowDeselect={false}
      nothingFoundMessage="Elegí un horario de la lista"
      maxDropdownHeight={220}
      autoComplete="off"
      size="sm"
      // The theme makes inputs tall; the times of a week go in rows, so they are shorter.
      styles={{ input: { height: 36, minHeight: 36 } }}
      w={92}
      miw={92}
      flex="none"
      error={error}
      onChange={(picked) => {
        onChange(picked ?? '');
      }}
    />
  );
}
