// Resizes an uploaded/captured photo down to a reasonable max dimension and
// re-encodes as JPEG before it's kept in memory / localStorage. Keeps scan
// history from ballooning past localStorage's ~5MB quota and keeps the
// photo private to the device (nothing is uploaded except, in OpenAI mode,
// directly to the analysis API call itself).
export const MAX_DIMENSION = 900;
export const JPEG_QUALITY = 0.82;

export class InvalidImageError extends Error {}

export async function fileToResizedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new InvalidImageError("That file doesn't look like an image. Please choose a photo.");
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new InvalidImageError("That image is too large. Please choose a smaller photo.");
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(rawDataUrl);

  const { width, height } = fitDimensions(image.naturalWidth, image.naturalHeight, MAX_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new InvalidImageError("Your browser couldn't process that image.");
  ctx.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new InvalidImageError("Couldn't read that file. Please try another photo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new InvalidImageError("That doesn't look like a valid image file."));
    img.src = dataUrl;
  });
}

export function fitDimensions(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = w > h ? max / w : max / h;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}
