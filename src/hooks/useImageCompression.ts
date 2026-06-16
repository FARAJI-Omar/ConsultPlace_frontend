import { useRef, useCallback, useState } from 'react';
import { compressImage } from '@/lib/compressImage';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/jpg']);

export function useImageCompression() {
  const promisesRef = useRef<Map<File, Promise<File>>>(new Map());
  const [compressing, setCompressing] = useState<Set<File>>(new Set());

  const trackFile = useCallback((file: File) => {
    if (IMAGE_TYPES.has(file.type) && !promisesRef.current.has(file)) {
      const compressed = compressImage(file).then((result) => {
        setCompressing((prev) => {
          const next = new Set(prev);
          next.delete(file);
          return next;
        });
        return result;
      });
      promisesRef.current.set(file, compressed);
      setCompressing((prev) => new Set(prev).add(file));
    }
  }, []);

  const trackFiles = useCallback((newFiles: File[]) => {
    newFiles.forEach(trackFile);
  }, [trackFile]);

  const untrackFile = useCallback((file: File) => {
    promisesRef.current.delete(file);
    setCompressing((prev) => {
      const next = new Set(prev);
      next.delete(file);
      return next;
    });
  }, []);

  const getCompressedFile = useCallback(async (file: File): Promise<File> => {
    const promise = promisesRef.current.get(file);
    return promise ? await promise : file;
  }, []);

  const getCompressedFiles = useCallback(async (files: File[]): Promise<File[]> => {
    return Promise.all(files.map(getCompressedFile));
  }, [getCompressedFile]);

  const isCompressing = compressing.size > 0;

  return { trackFile, trackFiles, untrackFile, getCompressedFile, getCompressedFiles, isCompressing, compressingFiles: compressing };
}
