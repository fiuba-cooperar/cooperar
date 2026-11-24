import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconAlertCircle, IconArrowRight, IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { ProfileSaveError } from '../../api/useManagedProfile';

const SAVE_ERRORS: Record<ProfileSaveError['reason'], string> = {
  invalid: 'Revisá los datos: hay alguno que no pudimos guardar.',
  unavailable: 'No pudimos guardar los cambios. Probá de nuevo en unos minutos.',
};

/**
 * One section of the profile, saved on its own. `onSave` validates and saves; it returns false when the form has
 * errors to show, and rejects with a {@link ProfileSaveError} when saving fails.
 */
export function SectionForm({
  id,
  title,
  description,
  hidden,
  saving,
  next,
  dirty,
  onDirtyChange,
  onSave,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  hidden: boolean;
  saving: boolean;
  next?: { label: string; go: () => void } | undefined;
  /** Whether the form has changes that are not saved yet. */
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSave: () => Promise<boolean>;
  children: ReactNode;
}) {
  // The page passes a new function on every render, so it is read from a ref: the effects run when `dirty` changes.
  const report = useRef(onDirtyChange);
  useEffect(() => {
    report.current = onDirtyChange;
  });
  useEffect(() => {
    report.current(dirty);
  }, [dirty]);
  useEffect(
    () => () => {
      report.current(false);
    },
    [],
  );
  const [result, setResult] = useState<'saved' | ProfileSaveError['reason'] | null>(null);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    try {
      if (await onSave()) setResult('saved');
    } catch (caught) {
      setResult(caught instanceof ProfileSaveError ? caught.reason : 'unavailable');
    }
  }

  const headingId = `${id}-title`;
  return (
    <Paper
      component="form"
      withBorder
      radius="lg"
      p={{ base: 'md', sm: 28 }}
      aria-labelledby={headingId}
      hidden={hidden}
      noValidate
      onSubmit={(event: SyntheticEvent<HTMLFormElement>) => void handleSubmit(event)}
    >
      <Stack gap={20}>
        <Stack gap={4}>
          <Title order={2} id={headingId} fz={20} style={{ letterSpacing: 'normal' }}>
            {title}
          </Title>
          {description && <Text c="dimmed">{description}</Text>}
        </Stack>
        {children}
        {result && result !== 'saved' && (
          <Alert color="red" icon={<IconAlertCircle aria-hidden />} role="alert">
            {SAVE_ERRORS[result]}
          </Alert>
        )}
        <Group
          gap="sm"
          pt="md"
          style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
        >
          <Button type="submit" h={48} loading={saving} loaderProps={{ type: 'dots' }}>
            Guardar cambios
          </Button>
          {next && (
            <Button
              type="button"
              variant="default"
              h={48}
              rightSection={<IconArrowRight size={18} aria-hidden />}
              onClick={next.go}
            >
              Seguir con {next.label.toLowerCase()}
            </Button>
          )}
          {/* Always in the page, so the screen reader announces the message when it appears. */}
          <Text role="status" size="sm" c="dimmed" flex="1 1 220px">
            {result === 'saved' && (
              <Group component="span" gap={6} c="green.8">
                <IconCircleCheck size={18} aria-hidden />
                Guardamos los cambios. Ya se ven en tu ficha pública.
              </Group>
            )}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
