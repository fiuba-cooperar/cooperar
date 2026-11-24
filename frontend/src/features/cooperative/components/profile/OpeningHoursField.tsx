import { ActionIcon, Button, Group, Switch, Text } from '@mantine/core';
import { IconPlus, IconX } from '@tabler/icons-react';
import type { OpeningDay } from '@/api/generated/model';
import { DAY_LABELS, ROWS } from '@/features/organizations/openingHours';
import styles from './OpeningHoursField.module.css';
import { CopyHours } from './CopyHours';
import { TimeField } from './TimeField';
import {
  DEFAULT_RANGE,
  MAX_RANGES_PER_DAY,
  type TimeRange,
  type WeekErrors,
  type WeekHours,
} from './openingHoursForm';

/** The hours of each day of the week: closed, or one or more ranges. */
export function OpeningHoursField({
  value,
  errors,
  onChange,
}: {
  value: WeekHours;
  errors: WeekErrors;
  onChange: (day: OpeningDay, ranges: TimeRange[]) => void;
}) {
  return (
    <ul className={styles.week}>
      {ROWS.map((day, index) => {
        const ranges = value[day];
        const previousDay = ROWS[index - 1];
        const previous = previousDay ? value[previousDay] : [];
        const open = ranges.length > 0;
        const error = errors[day];
        const label = DAY_LABELS[day];
        return (
          <li key={day} className={styles.day}>
            <Switch
              className={styles.toggle}
              label={label}
              checked={open}
              onChange={(event) => {
                // Opening a day starts from the day before, so a week of the same hours takes a few clicks.
                const opened = previous.length > 0 ? previous : [DEFAULT_RANGE];
                onChange(day, event.currentTarget.checked ? opened.map((r) => ({ ...r })) : []);
              }}
            />
            {open ? (
              <div className={styles.ranges}>
                {ranges.map((range, rangeIndex) => {
                  const name =
                    ranges.length > 1 ? `${label}, franja ${String(rangeIndex + 1)}` : label;
                  return (
                    <Group key={rangeIndex} gap="xs" wrap="nowrap">
                      <TimeField
                        label={`${name}, apertura`}
                        error={error !== undefined}
                        value={range.opensAt}
                        onChange={(opensAt) => {
                          onChange(
                            day,
                            ranges.map((r, i) => (i === rangeIndex ? { ...r, opensAt } : r)),
                          );
                        }}
                      />
                      <Text size="sm" c="dimmed" aria-hidden>
                        a
                      </Text>
                      <TimeField
                        label={`${name}, cierre`}
                        closing
                        error={error !== undefined}
                        value={range.closesAt}
                        onChange={(closesAt) => {
                          onChange(
                            day,
                            ranges.map((r, i) => (i === rangeIndex ? { ...r, closesAt } : r)),
                          );
                        }}
                      />
                      {ranges.length > 1 && (
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size={32}
                          aria-label={`Quitar ${name.toLowerCase()}`}
                          onClick={() => {
                            onChange(
                              day,
                              ranges.filter((_, i) => i !== rangeIndex),
                            );
                          }}
                        >
                          <IconX size={18} aria-hidden />
                        </ActionIcon>
                      )}
                    </Group>
                  );
                })}
              </div>
            ) : (
              <Text size="sm" c="dimmed" className={styles.closed}>
                Cerrado
              </Text>
            )}
            {open && (
              <Group gap={4} className={styles.actions}>
                {ranges.length < MAX_RANGES_PER_DAY && (
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    leftSection={<IconPlus size={14} aria-hidden />}
                    aria-label={`Agregar una franja el ${label.toLowerCase()}`}
                    onClick={() => {
                      onChange(day, [...ranges, { opensAt: '', closesAt: '' }]);
                    }}
                  >
                    Agregar franja
                  </Button>
                )}
                <CopyHours
                  day={day}
                  onCopy={(days) => {
                    for (const target of days)
                      onChange(
                        target,
                        ranges.map((r) => ({ ...r })),
                      );
                  }}
                />
              </Group>
            )}
            {open && error && (
              <Text size="sm" c="red" role="alert" className={styles.error}>
                {error}
              </Text>
            )}
          </li>
        );
      })}
    </ul>
  );
}
