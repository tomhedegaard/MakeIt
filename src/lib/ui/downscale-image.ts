/**
 * Downscale a camera photo in the browser before it goes to a server
 * action: longest side 1280 px, JPEG at 0.82. That keeps the upload well
 * under the 1 MB server-action limit, gives Claude a size it reads well,
 * and turns HEIC/PNG into one predictable format.
 */
export const MAX_SIDE = 1280;

export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function downscaleImage(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], "meal.jpg", { type: "image/jpeg" }) : null;
  } catch {
    return null;
  }
}
