import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Fiş yazılarının okunabilir kalması için yeterli, dosyayı da küçük tutan genişlik. */
const MAX_WIDTH = 1800;

export interface PreparedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/**
 * Fotoğrafı küçültür (sadece genişliği; uzun fişlerde boy korunur),
 * JPEG olarak sıkıştırır ve base64 verisini döndürür.
 */
export async function prepareImage(uri: string, originalWidth?: number): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  if (!originalWidth || originalWidth > MAX_WIDTH) {
    context.resize({ width: MAX_WIDTH, height: null });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
  if (!result.base64) throw new Error('Fotoğraf işlenemedi.');
  return { uri: result.uri, base64: result.base64, width: result.width, height: result.height };
}
