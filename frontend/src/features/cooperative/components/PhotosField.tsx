import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ActionIcon, Button, Stack, Text } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { LabelWithHint } from '@/components/form/LabelWithHint';
import { ACCEPTED } from './photoRules';
import styles from './PhotosField.module.css';

interface Props {
  /** Id of the button that chooses files, which the label points at. */
  id: string;
  label: string;
  /** What the person can upload: shown next to the label and read by screen readers. */
  hint: string;
  max: number;
  /** Whether the first photo is marked as the cover. */
  firstIsCover: boolean;
  /** Photos already saved. */
  photos: { id: string; url: string }[];
  /** Photos chosen and not saved yet, shown as previews. */
  files: File[];
  error: string | undefined;
  removing: boolean;
  onAdd: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onRemovePhoto: (photoId: string) => void;
  /** The ids of the photos the product has, in the order the person left them. */
  onReorderPhotos: (photoIds: string[]) => void;
  /** Moves the file waiting at `from` to the place `to`. */
  onReorderFiles: (from: number, to: number) => void;
}

interface TileProps {
  id: string;
  src: string;
  alt: string;
  cover: boolean;
  sortable: boolean;
  removeLabel: string;
  removing?: boolean;
  onRemove: () => void;
}

/** One thumbnail. The others slide aside while it is dragged: dnd-kit moves them with a transform. */
function PhotoTile({
  id,
  src,
  alt,
  cover,
  sortable,
  removeLabel,
  removing = false,
  onRemove,
}: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !sortable,
  });
  return (
    <li
      ref={setNodeRef}
      className={[styles.item, sortable ? styles.draggable : '', isDragging ? styles.moving : '']
        .filter(Boolean)
        .join(' ')}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...(sortable ? attributes : {})}
      {...(sortable ? listeners : {})}
    >
      <img src={src} alt={alt} className={styles.image} draggable={false} />
      <ActionIcon
        type="button"
        variant="filled"
        color="dark"
        size="sm"
        radius="xl"
        className={styles.remove}
        loading={removing}
        aria-label={removeLabel}
        onClick={onRemove}
      >
        <IconX size={14} aria-hidden />
      </ActionIcon>
      {cover && <span className={styles.cover}>Portada</span>}
    </li>
  );
}

/**
 * A sortable set of photos: the saved ones, the ones waiting to be saved and the button (or the drop zone) to choose
 * more. Products and the gallery of the profile use it.
 */
export function PhotosField({
  id,
  label,
  hint,
  max,
  firstIsCover,
  photos: savedPhotos,
  files,
  error,
  removing,
  onAdd,
  onRemoveFile,
  onRemovePhoto,
  onReorderPhotos,
  onReorderFiles,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  // The new order shows the moment the photo is dropped, without waiting for the server: if the tile went back to
  // its old place first, it would jump. It lasts until the saved photos change (the server's answer, or the undo).
  const [lastSaved, setLastSaved] = useState(savedPhotos);
  const [order, setOrder] = useState<string[]>();
  if (savedPhotos !== lastSaved) {
    setLastSaved(savedPhotos);
    setOrder(undefined);
  }
  const photos = order
    ? order.flatMap((id) => savedPhotos.find((photo) => photo.id === id) ?? [])
    : savedPhotos;
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(
    () => () => {
      previews.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    },
    [previews],
  );
  // A file has no id of its own. The position is enough: the list only changes once a drag is over.
  const fileKeys = files.map((_, index) => `file-${String(index)}`);

  const total = photos.length + files.length;
  const [overDropzone, setOverDropzone] = useState(false);
  // Moving a tile needs a real drag, so a click on its remove button still works.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setOverDropzone(false);
    if (total < max) onAdd(Array.from(event.dataTransfer.files));
  }

  function dragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const photoFrom = photos.findIndex(({ id }) => id === active.id);
    const photoTo = photos.findIndex(({ id }) => id === over.id);
    if (photoFrom >= 0 && photoTo >= 0) {
      const ids = arrayMove(
        photos.map(({ id }) => id),
        photoFrom,
        photoTo,
      );
      setOrder(ids);
      onReorderPhotos(ids);
      return;
    }
    const fileFrom = fileKeys.indexOf(String(active.id));
    const fileTo = fileKeys.indexOf(String(over.id));
    if (fileFrom >= 0 && fileTo >= 0) onReorderFiles(fileFrom, fileTo);
  }

  function choose(event: ChangeEvent<HTMLInputElement>) {
    onAdd(Array.from(event.currentTarget.files ?? []));
    event.currentTarget.value = '';
  }

  return (
    <Stack gap={6}>
      <LabelWithHint htmlFor={id} label={label} hint={hint} />
      <div
        className={[styles.dropzone, overDropzone ? styles.dragging : ''].join(' ')}
        onDragOver={(event) => {
          event.preventDefault();
          setOverDropzone(true);
        }}
        onDragLeave={() => {
          setOverDropzone(false);
        }}
        onDrop={dropFiles}
      >
        {total > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={dragEnd}>
            <ul className={styles.list}>
              <SortableContext items={photos.map(({ id }) => id)} strategy={rectSortingStrategy}>
                {photos.map((photo, index) => (
                  <PhotoTile
                    key={photo.id}
                    id={photo.id}
                    src={photo.url}
                    alt={`Foto ${String(index + 1)}`}
                    cover={firstIsCover && index === 0}
                    sortable={photos.length > 1}
                    removeLabel={`Quitar la foto ${String(index + 1)}`}
                    removing={removing}
                    onRemove={() => {
                      onRemovePhoto(photo.id);
                    }}
                  />
                ))}
              </SortableContext>
              <SortableContext items={fileKeys} strategy={rectSortingStrategy}>
                {files.map((_, index) => (
                  <PhotoTile
                    key={fileKeys[index]}
                    id={fileKeys[index] ?? ''}
                    src={previews[index] ?? ''}
                    alt={`Foto nueva ${String(index + 1)}`}
                    cover={firstIsCover && photos.length === 0 && index === 0}
                    sortable={files.length > 1}
                    removeLabel={`Quitar la foto nueva ${String(index + 1)}`}
                    onRemove={() => {
                      onRemoveFile(index);
                    }}
                  />
                ))}
              </SortableContext>
            </ul>
          </DndContext>
        )}
        {total < max ? (
          <div className={styles.add}>
            <input
              ref={input}
              type="file"
              accept={ACCEPTED.join(',')}
              multiple
              hidden
              tabIndex={-1}
              data-testid="photos-input"
              onChange={choose}
            />
            <span>Arrastrá las fotos acá o</span>
            <Button
              id={id}
              type="button"
              variant="outline"
              h={40}
              px={16}
              aria-description={hint}
              onClick={() => input.current?.click()}
            >
              Elegir archivos
            </Button>
          </div>
        ) : (
          <Text size="sm">Llegaste al máximo de {max} fotos.</Text>
        )}
      </div>
      {error && (
        <Text size="sm" c="red.8" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}
