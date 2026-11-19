export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTOS_HINT =
  'Hasta 5 fotos. Máximo 5 MB cada una. La primera es la portada. Arrastralas para cambiar el orden.';
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/** What a chosen file is rejected for, or null when it can be added. */
export function photoProblem(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return `${file.name}: tiene que ser JPG, PNG o WebP.`;
  if (file.size > MAX_PHOTO_BYTES) return `${file.name}: pesa más de 5 MB.`;
  return null;
}
