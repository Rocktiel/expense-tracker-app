import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ScanPart } from './gemini';

/**
 * Gemini'ye gönderilen fotoğrafın genişliği. 1200 px fiş yazıları için yeterli,
 * dosyayı küçük tuttuğu için yükleme ve okuma daha hızlı oluyor.
 */
const MAX_WIDTH = 1200;
/** JPEG sıkıştırma kalitesi (0-1). */
const COMPRESS = 0.75;

export interface PreparedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

async function compressToJpeg(uri: string, originalWidth?: number) {
  const context = ImageManipulator.manipulate(uri);
  if (!originalWidth || originalWidth > MAX_WIDTH) {
    context.resize({ width: MAX_WIDTH, height: null });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: COMPRESS, base64: true });
  if (!result.base64) throw new Error('Fotoğraf işlenemedi.');
  return { ...result, base64: result.base64 };
}

/**
 * Fotoğrafı küçültür (sadece genişliği; uzun fişlerde boy korunur),
 * JPEG olarak sıkıştırır ve önizleme + gönderim için base64 verisini döndürür.
 */
export async function prepareImage(uri: string, originalWidth?: number): Promise<PreparedImage> {
  const result = await compressToJpeg(uri, originalWidth);
  return { uri: result.uri, base64: result.base64, width: result.width, height: result.height };
}

/**
 * Gemini'ye gönderilecek görsel parçasını üretir: 1200 px genişlik, JPEG %75.
 * Hazırlanmış bir görselin base64'ü yoksa (ör. eski bir taslak) anında sıkıştırır.
 */
export async function uriToCompressedScanPart(uri: string): Promise<ScanPart> {
  const result = await compressToJpeg(uri);
  return { base64: result.base64, mimeType: 'image/jpeg' };
}
