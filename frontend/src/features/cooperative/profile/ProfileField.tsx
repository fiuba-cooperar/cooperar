import { Badge, Group, Input, SegmentedControl, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

const OPTIONS = [
  { value: 'public', label: 'Público' },
  { value: 'private', label: 'Privado' },
];

/** Fixed visibility: the observatory decides it, so the organization cannot change it. */
export type FixedVisibility = 'public' | 'private';

interface ProfileFieldProps {
  /** Id of the input inside `children`, so the label points at it. */
  htmlFor: string;
  label: ReactNode;
  /** Plain label for assistive technology, when `label` is more than text. */
  hint?: string;
  /** The organization chooses: the control shows the current value and calls `onVisibilityChange`. */
  visibility?: { isPublic: boolean; onChange: (isPublic: boolean) => void };
  /** The observatory decides: a badge. */
  fixed?: FixedVisibility;
  error?: string | undefined;
  children: ReactNode;
}

/** A form field with its label and who sees it, so no field of the profile hides its visibility. */
export function ProfileField({
  htmlFor,
  label,
  hint,
  visibility,
  fixed,
  error,
  children,
}: ProfileFieldProps) {
  const text = typeof label === 'string' ? label : (hint ?? htmlFor);
  return (
    <Stack gap={6} miw={0}>
      <Group justify="space-between" gap="xs" mih={28} wrap="wrap">
        <Input.Label htmlFor={htmlFor} style={{ marginBottom: 0 }}>
          {label}
        </Input.Label>
        {visibility && (
          <SegmentedControl
            size="xs"
            data={OPTIONS}
            value={visibility.isPublic ? 'public' : 'private'}
            onChange={(value) => {
              visibility.onChange(value === 'public');
            }}
            aria-label={`Visibilidad: ${text}`}
          />
        )}
        {fixed && <VisibilityBadge visibility={fixed} />}
      </Group>
      {children}
      {error && (
        <Text size="sm" c="red.8" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}

export function VisibilityBadge({ visibility }: { visibility: FixedVisibility }) {
  return (
    <Badge variant="light" color={visibility === 'public' ? 'brand' : 'gray'} tt="none">
      {visibility === 'public' ? 'Público' : 'Privado'}
    </Badge>
  );
}
