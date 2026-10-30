import { Input, ThemeIcon, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import styles from './LabelWithHint.module.css';

interface LabelWithHintProps {
  /** Id of the field the label belongs to. */
  htmlFor: string;
  label: string;
  hint: string;
}

/**
 * Field label with an info icon that shows `hint` in a tooltip on hover or tap. The icon stays out of the tab
 * order, so Tab goes from field to field; screen readers get the hint from the field itself, which must carry it
 * as `aria-description` (Mantine overwrites any `aria-describedby` passed to its inputs).
 */
export function LabelWithHint({ htmlFor, label, hint }: LabelWithHintProps) {
  return (
    <div className={styles.row}>
      {/* The theme's label margin is an inline style, so it is reset the same way; the row carries it instead. */}
      <Input.Label htmlFor={htmlFor} style={{ marginBottom: 0 }}>
        {label}
      </Input.Label>
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
    </div>
  );
}
