import { Button, Group, Input, Stack, Text } from '@mantine/core';
import { IconPhotoUp, IconTrash } from '@tabler/icons-react';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { ACCEPTED, photoProblem } from '../photoRules';
import styles from './ProfileSections.module.css';

interface Props {
  /** «el logo», «la foto de portada»: completes the labels of the buttons. */
  name: string;
  label: string;
  shape: 'round' | 'wide';
  url: string | null | undefined;
  busy: boolean;
  /** Rejects when the server does not take the photo. */
  onChoose: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
}

/** A photo the profile has one of, like the logo or the cover: a new one replaces it at once. */
export function SinglePhotoField({ name, label, shape, url, busy, onChoose, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const [error, setError] = useState<string>();

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const problem = photoProblem(file);
    setError(problem ?? undefined);
    if (problem) return;
    try {
      await onChoose(file);
    } catch {
      setError('No pudimos subir la foto. Probá de nuevo en unos minutos.');
    }
  }

  async function remove() {
    setError(undefined);
    try {
      await onRemove();
    } catch {
      setError('No pudimos quitar la foto. Probá de nuevo en unos minutos.');
    }
  }

  const frame = [styles.placeholder, shape === 'round' ? styles.logo : styles.cover].join(' ');
  return (
    <Stack gap={6}>
      <Input.Label component="span">{label}</Input.Label>
      {url ? (
        <img src={url} alt={label} className={[frame, styles.image].join(' ')} />
      ) : (
        <div className={frame} aria-hidden>
          Sin {label.toLowerCase()}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',')}
        hidden
        tabIndex={-1}
        aria-label={`Archivo para ${name}`}
        onChange={(event) => void choose(event)}
      />
      <Group gap="xs">
        <Button
          type="button"
          variant="default"
          size="sm"
          leftSection={<IconPhotoUp size={16} aria-hidden />}
          loading={busy}
          aria-describedby={error ? errorId : undefined}
          onClick={() => input.current?.click()}
        >
          {url ? `Cambiar ${name}` : `Subir ${name}`}
        </Button>
        {url && (
          <Button
            type="button"
            variant="subtle"
            color="red"
            size="sm"
            leftSection={<IconTrash size={16} aria-hidden />}
            disabled={busy}
            onClick={() => void remove()}
          >
            Quitar {name}
          </Button>
        )}
      </Group>
      {error && (
        <Text id={errorId} size="sm" c="red.8" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
