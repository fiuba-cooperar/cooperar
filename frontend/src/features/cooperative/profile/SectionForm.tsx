import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import type { ReactNode, SyntheticEvent } from 'react';
import { ProfileSaveError } from '../api/useManagedProfile';

interface SectionFormProps {
  id: string;
  title: string;
  description?: string;
  /** What saving the section is doing now. */
  saving: boolean;
  saved: boolean;
  error: Error | null;
  onSubmit: () => void;
  /** Label of the next section, to offer moving on; missing on the last one. */
  nextLabel?: string | undefined;
  onNext?: () => void;
  children: ReactNode;
}

function errorMessage(error: Error): string {
  return error instanceof ProfileSaveError && error.reason === 'invalid'
    ? 'Revisá los datos: alguno no es válido.'
    : 'No pudimos guardar los cambios. Probá de nuevo en unos minutos.';
}

/** One section of the profile: its fields, the save button, and the way on to the next section. */
export function SectionForm({
  id,
  title,
  description,
  saving,
  saved,
  error,
  onSubmit,
  nextLabel,
  onNext,
  children,
}: SectionFormProps) {
  function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Stack gap="lg">
        <Paper component="section" withBorder radius="lg" px={32} py={28} aria-labelledby={id}>
          <Stack gap="lg">
            <Stack gap={4}>
              <Title order={2} id={id} fz={20}>
                {title}
              </Title>
              {description && (
                <Text size="sm" c="dimmed">
                  {description}
                </Text>
              )}
            </Stack>
            {children}
          </Stack>
        </Paper>
        <div role="status">
          {saved && !error && <Alert color="green">Guardamos los cambios de «{title}».</Alert>}
        </div>
        {error && (
          <Alert color="red" role="alert">
            {errorMessage(error)}
          </Alert>
        )}
        <Group gap="sm">
          <Button type="submit" size="md" loading={saving}>
            Guardar cambios
          </Button>
          {nextLabel && onNext && (
            <Button type="button" size="md" variant="outline" onClick={onNext}>
              Seguir con {nextLabel.toLowerCase()}
            </Button>
          )}
        </Group>
      </Stack>
    </form>
  );
}
