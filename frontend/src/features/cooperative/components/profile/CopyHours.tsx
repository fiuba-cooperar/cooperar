import { ActionIcon, Button, Checkbox, Group, Popover, Stack, Text } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useState } from 'react';
import { OpeningDay } from '@/api/generated/model';
import { DAY_LABELS, ROWS, WEEK } from '@/features/organizations/openingHours';

const WORKDAYS: OpeningDay[] = WEEK.slice(0, 5);

/** Copies the hours of a day to the other days that the person picks, so a week of the same hours is not typed over. */
export function CopyHours({
  day,
  onCopy,
}: {
  day: OpeningDay;
  onCopy: (days: OpeningDay[]) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [picked, setPicked] = useState<OpeningDay[]>([]);
  const others = ROWS.filter((other) => other !== day);
  const label = DAY_LABELS[day].toLowerCase();

  function pick(days: OpeningDay[]) {
    setPicked(days.filter((other) => other !== day));
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withArrow
      shadow="md"
      trapFocus
    >
      <Popover.Target>
        <ActionIcon
          variant="subtle"
          size={32}
          aria-label={`Copiar el horario del ${label} a otros días`}
          aria-haspopup="dialog"
          onClick={() => {
            setPicked([]);
            setOpened((current) => !current);
          }}
        >
          <IconCopy size={16} aria-hidden />
        </ActionIcon>
      </Popover.Target>
      <Popover.Dropdown aria-label={`Copiar el horario del ${label}`}>
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Copiar a
          </Text>
          <Checkbox.Group
            value={picked}
            onChange={(values) => {
              pick(ROWS.filter((other) => values.includes(other)));
            }}
          >
            <Stack gap={6}>
              {others.map((other) => (
                <Checkbox key={other} value={other} label={DAY_LABELS[other]} />
              ))}
            </Stack>
          </Checkbox.Group>
          <Group gap={4}>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => {
                pick(WORKDAYS);
              }}
            >
              Lunes a viernes
            </Button>
            <Button
              variant="subtle"
              size="compact-xs"
              onClick={() => {
                pick(ROWS);
              }}
            >
              Todos
            </Button>
          </Group>
          <Button
            size="compact-md"
            disabled={picked.length === 0}
            onClick={() => {
              onCopy(picked);
              setOpened(false);
            }}
          >
            Copiar
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
