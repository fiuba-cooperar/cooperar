import { ActionIcon, Button, Menu } from '@mantine/core';
import { IconPencil, IconPhoto, IconPhotoUp, IconTrash } from '@tabler/icons-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { ImageCropDialog } from '../ImageCropDialog';
import { ACCEPTED, photoProblem } from '../photoRules';
import styles from './ProfileSections.module.css';

// The cover shows as a strip of this proportion on the public profile (`OrganizationProfilePage.module.css`) and in
// the panel, so the framing is what visitors get; the logo shows as a circle.
const LOGO_ASPECT = 1;
const COVER_ASPECT = 6;
const LOGO_MAX_WIDTH = 512;
const COVER_MAX_WIDTH = 1600;

interface Props {
  /** «el logo», «la portada»: completes the labels of the controls. */
  name: string;
  label: string;
  shape: 'round' | 'wide';
  url: string | null | undefined;
  busy: boolean;
  /** Rejects when the server does not take the photo. */
  onChoose: (file: File) => Promise<unknown>;
  onRemove: () => Promise<unknown>;
  /** Why the photo was not taken, or undefined when the last attempt went well. */
  onError: (message: string | undefined) => void;
  className?: string | undefined;
}

/**
 * A photo the profile has one of, like the logo or the cover: a new one replaces it at once, after the person frames
 * it. The controls sit on the photo itself: a button to load it, or a menu to change or remove it.
 */
export function SinglePhotoField({
  name,
  label,
  shape,
  url,
  busy,
  onChoose,
  onRemove,
  onError,
  className,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  // The file chosen and not uploaded yet: the person frames it first.
  const [chosen, setChosen] = useState<File>();
  const round = shape === 'round';

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const problem = photoProblem(file);
    onError(problem ?? undefined);
    if (!problem) setChosen(file);
  }

  async function upload(cropped: File) {
    setChosen(undefined);
    try {
      await onChoose(cropped);
    } catch {
      onError('No pudimos subir la foto. Probá de nuevo en unos minutos.');
    }
  }

  async function remove() {
    onError(undefined);
    try {
      await onRemove();
    } catch {
      onError('No pudimos quitar la foto. Probá de nuevo en unos minutos.');
    }
  }

  const pick = () => {
    input.current?.click();
  };
  const frame = [styles.frame, round ? styles.logo : styles.cover].join(' ');
  return (
    <div className={[styles.photo, className].filter(Boolean).join(' ')}>
      {chosen && (
        <ImageCropDialog
          file={chosen}
          title={`Encuadrar ${name}`}
          aspect={round ? LOGO_ASPECT : COVER_ASPECT}
          round={round}
          maxWidth={round ? LOGO_MAX_WIDTH : COVER_MAX_WIDTH}
          onCancel={() => {
            setChosen(undefined);
          }}
          onConfirm={(cropped) => void upload(cropped)}
        />
      )}
      {url ? (
        <img src={url} alt={label} className={[frame, styles.image].join(' ')} />
      ) : (
        <div className={[frame, styles.placeholder].join(' ')} aria-hidden>
          {!round && <IconPhoto size={28} stroke={1.5} />}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(',')}
        hidden
        tabIndex={-1}
        aria-label={`Archivo para ${name}`}
        onChange={choose}
      />
      {url ? (
        <Menu position="bottom-end" withinPortal>
          <Menu.Target>
            <ActionIcon
              variant="default"
              size={36}
              radius="xl"
              loading={busy}
              aria-label={`Editar ${name}`}
              className={round ? styles.editLogo : styles.editCover}
            >
              <IconPencil size={18} aria-hidden />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconPhotoUp size={16} aria-hidden />} onClick={pick}>
              Cambiar {name}
            </Menu.Item>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} aria-hidden />}
              onClick={() => void remove()}
            >
              Quitar {name}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      ) : round ? (
        <ActionIcon
          variant="default"
          size={44}
          radius="xl"
          loading={busy}
          aria-label={`Cargar ${name.replace(/^(el|la) /, '')}`}
          className={styles.loadLogo}
          onClick={pick}
        >
          <IconPhotoUp size={20} aria-hidden />
        </ActionIcon>
      ) : (
        <Button
          variant="default"
          h={44}
          loading={busy}
          leftSection={<IconPhotoUp size={18} aria-hidden />}
          className={styles.loadCover}
          onClick={pick}
        >
          Cargar {name.replace(/^(el|la) /, '')}
        </Button>
      )}
    </div>
  );
}
