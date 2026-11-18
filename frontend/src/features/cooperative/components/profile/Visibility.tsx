import { Badge, Group, Input, SegmentedControl, ThemeIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle, IconLock, IconWorld } from '@tabler/icons-react';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import type { ReactNode } from 'react';
import { Visibility } from '@/api/generated/model';
import styles from './Visibility.module.css';

const VISIBILITY_OPTIONS = [
  { value: Visibility.PUBLIC, label: 'Público' },
  { value: Visibility.PRIVATE, label: 'Privado' },
];

/** The visibility of a field the organization cannot change. */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === Visibility.PUBLIC;
  return (
    <Badge
      variant="light"
      color={isPublic ? 'brand' : 'gray'}
      tt="none"
      fw={600}
      leftSection={
        isPublic ? <IconWorld size={14} aria-hidden /> : <IconLock size={14} aria-hidden />
      }
      className={styles.badge}
    >
      {isPublic ? 'Público' : 'Privado'}
    </Badge>
  );
}

/** Lets the organization choose whether anyone or only the observatory sees a field. */
export function VisibilityToggle({
  field,
  value,
  onChange,
}: {
  /** What the field is, as in "Visibilidad de {field}". */
  field: string;
  value: Visibility;
  onChange: (visibility: Visibility) => void;
}) {
  return (
    <div role="radiogroup" aria-label={`Visibilidad de ${field}`}>
      <SegmentedControl
        size="xs"
        color="brand"
        data={VISIBILITY_OPTIONS}
        value={value}
        onChange={(next) => {
          onChange(next === Visibility.PRIVATE ? Visibility.PRIVATE : Visibility.PUBLIC);
        }}
      />
    </div>
  );
}

/**
 * The label of a profile field with who sees it next to it. The label is a `<label>` for `htmlFor`, or a `<legend>`
 * when the field is a group, so the control on the right never ends up inside it.
 */
export function FieldHeader({
  htmlFor,
  label,
  hint,
  visibility,
  legend = false,
}: {
  htmlFor?: string;
  label: string;
  /** Shown in a tooltip next to the label; the field must also carry it as `aria-description`. */
  hint?: string;
  visibility: ReactNode;
  legend?: boolean;
}) {
  let title: ReactNode;
  if (legend) {
    title = (
      <Group gap={4} wrap="nowrap">
        <legend className={styles.legend}>{label}</legend>
        {hint && <HintIcon hint={hint} />}
      </Group>
    );
  } else if (hint && htmlFor) {
    title = <LabelWithHint htmlFor={htmlFor} label={label} hint={hint} />;
  } else {
    title = (
      <Input.Label htmlFor={htmlFor} style={{ marginBottom: 0 }}>
        {label}
      </Input.Label>
    );
  }
  return (
    <Group justify="space-between" gap="xs" wrap="wrap" className={styles.header}>
      {title}
      {visibility}
    </Group>
  );
}

function HintIcon({ hint }: { hint: string }) {
  return (
    <Tooltip
      label={hint}
      multiline
      maw={280}
      withArrow
      events={{ hover: true, focus: false, touch: true }}
    >
      <ThemeIcon variant="transparent" size={20} aria-hidden="true">
        <IconInfoCircle size={18} />
      </ThemeIcon>
    </Tooltip>
  );
}
