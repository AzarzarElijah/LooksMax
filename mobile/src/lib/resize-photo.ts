import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Caps the long edge of a captured/picked photo before it's stored or sent anywhere. Two
// independent reasons: (1) a face-analysis vision call gets no benefit from a source image much
// larger than this — face-level detail is well within a ~1920px long edge — so this also reduces
// bandwidth/cost for real analysis calls later; (2) it bounds the eventual analyze-scan request
// payload to a predictable size regardless of the capturing device's native camera resolution,
// which capture.tsx/ImagePicker otherwise leave uncapped (their `quality` option only controls
// JPEG compression, not pixel dimensions).
export const MAX_LONG_EDGE_PX = 1920;

export interface PhotoDimensions {
  uri: string;
  width: number;
  height: number;
}

// Only re-encodes when the photo actually exceeds the cap, and resizes by whichever dimension is
// the long edge so portrait and landscape captures are both handled correctly. If the source
// reports no dimensions (ImagePicker can return 0/0 in rare cases), the photo is passed through
// unresized rather than guessing — the Edge Function's own size guard is the backstop for that.
export async function capPhotoResolution({ uri, width, height }: PhotoDimensions): Promise<PhotoDimensions> {
  const longEdge = Math.max(width, height);
  if (longEdge <= 0 || longEdge <= MAX_LONG_EDGE_PX) {
    return { uri, width, height };
  }

  const isWidthTheLongEdge = width >= height;
  const rendered = await ImageManipulator.manipulate(uri)
    .resize(isWidthTheLongEdge ? { width: MAX_LONG_EDGE_PX } : { height: MAX_LONG_EDGE_PX })
    .renderAsync();
  // compress: 1 (minimal additional loss) — the dimension reduction above already does the heavy
  // lifting on file size, so there's no need to compound it with a second lossy compression pass.
  const saved = await rendered.saveAsync({ compress: 1, format: SaveFormat.JPEG });

  return { uri: saved.uri, width: saved.width, height: saved.height };
}
