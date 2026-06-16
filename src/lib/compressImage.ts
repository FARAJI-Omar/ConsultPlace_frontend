import imageCompression from 'browser-image-compression';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

export async function compressImage(file: File): Promise<File> {
  if (!IMAGE_TYPES.has(file.type)) return file;
  if (file.size <= 5 * 1024 * 1024) return file;
  try {
    const originalMB = file.size / (1024 * 1024);
    const options = {
      maxSizeMB: Math.max(originalMB * 0.25, 0.05),
      maxWidthOrHeight: 1920,
      initialQuality: 0.6,
      useWebWorker: true,
    };
    const compressed = await imageCompression(file, options);
    return new File([compressed], file.name, { type: compressed.type });
  } catch {
    return file;
  }
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map(compressImage));
}
