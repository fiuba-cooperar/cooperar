import { Button, Group, Slider, Stack, Text } from '@mantine/core';
import { AppModal } from '@/components/AppModal';
import { useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { cropToFile } from './cropImage';
import styles from './ImageCropDialog.module.css';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Lets the person frame a chosen image (move it and zoom) inside a fixed shape before it is uploaded, and hands back
 * the cropped file.
 */
export function ImageCropDialog({
  file,
  title,
  aspect,
  round = false,
  maxWidth,
  onCancel,
  onConfirm,
}: {
  file: File;
  title: string;
  /** Width over height of the frame. */
  aspect: number;
  round?: boolean;
  /** The cropped image is scaled down to this many pixels wide, when it is larger. */
  maxWidth: number;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}) {
  const [url, setUrl] = useState<string>();
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area>();
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);

  // A data URL needs no revoking, so a remount (StrictMode) cannot leave the image with a dead URL.
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setUrl(reader.result);
    };
    reader.readAsDataURL(file);
    return () => {
      reader.abort();
    };
  }, [file]);

  async function confirm() {
    if (!area) return;
    setWorking(true);
    setFailed(false);
    try {
      onConfirm(await cropToFile(file, area, maxWidth));
    } catch {
      setFailed(true);
      setWorking(false);
    }
  }

  return (
    <AppModal opened onClose={onCancel} title={title} size="xl">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Arrastrá la imagen y ajustá el zoom para elegir el encuadre.
        </Text>
        <div className={styles.frame}>
          {url && (
            <Cropper
              image={url}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              // The image takes the whole width (wide frame) or height (square one) of the frame, so a small picture is not shown at
              // its natural size, and the crop starts on the whole image.
              objectFit={aspect > 1 ? 'horizontal-cover' : 'vertical-cover'}
              cropShape={round ? 'round' : 'rect'}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              showGrid={!round}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => {
                setArea(pixels);
              }}
            />
          )}
        </div>
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={setZoom}
          label={null}
          aria-label="Zoom"
        />
        {failed && (
          <Text size="sm" c="red.8" role="alert">
            No pudimos recortar la imagen. Probá con otra.
          </Text>
        )}
        <Group justify="flex-end">
          <Button variant="default" h={44} onClick={onCancel}>
            Cancelar
          </Button>
          <Button h={44} disabled={!area} loading={working} onClick={() => void confirm()}>
            Guardar recorte
          </Button>
        </Group>
      </Stack>
    </AppModal>
  );
}
