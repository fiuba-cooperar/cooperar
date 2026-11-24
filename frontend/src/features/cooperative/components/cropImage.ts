import type { Area } from 'react-easy-crop';

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve(image);
    };
    image.onerror = () => {
      reject(new Error('The image could not be read'));
    };
    image.src = url;
  });
}

/**
 * The part of the image the person framed, as a new file. It is scaled down to at most `maxWidth` pixels wide, so the
 * result stays well under the size limit. PNGs stay PNG (they may be transparent); anything else becomes JPEG.
 */
export async function cropToFile(file: File, area: Area, maxWidth: number): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await load(url);
    const scale = Math.min(1, maxWidth / area.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(area.width * scale);
    canvas.height = Math.round(area.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('The image could not be cropped');
    context.drawImage(
      image,
      area.x,
      area.y,
      area.width,
      area.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const png = file.type === 'image/png';
    const type = png ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, 0.9);
    });
    if (!blob) throw new Error('The image could not be cropped');
    const name = file.name.replace(/\.[^.]+$/, '') + (png ? '.png' : '.jpg');
    return new File([blob], name, { type });
  } finally {
    URL.revokeObjectURL(url);
  }
}
