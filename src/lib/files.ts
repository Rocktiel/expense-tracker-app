import { Directory, File, Paths } from 'expo-file-system';

import { newId } from './format';

const DIR_NAME = 'receipts';

function receiptsDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Geçici bir dosyayı (kamera/galeri/PDF) kalıcı belgeler klasörüne kopyalar.
 * Mutlak yol yerine sadece dosya adını döndürür; iOS'ta uygulama klasörünün
 * yolu güncellemelerde değişebildiği için tam yol saklamak güvenli değildir.
 */
export async function saveAttachment(sourceUri: string, extension: string): Promise<string> {
  const name = `${newId()}.${extension.replace(/^\./, '').toLowerCase() || 'jpg'}`;
  const dest = new File(receiptsDir(), name);
  await new File(sourceUri).copy(dest);
  return name;
}

export function attachmentUri(name: string): string {
  return new File(Paths.document, DIR_NAME, name).uri;
}

export function attachmentExists(name: string): boolean {
  try {
    return new File(Paths.document, DIR_NAME, name).exists;
  } catch {
    return false;
  }
}

export function isPdf(nameOrUri: string): boolean {
  return /\.pdf$/i.test(nameOrUri);
}

export function deleteAttachments(names: string[] | undefined): void {
  if (!names) return;
  for (const name of names) {
    try {
      const file = new File(Paths.document, DIR_NAME, name);
      if (file.exists) file.delete();
    } catch {
      // Dosya zaten silinmiş olabilir; sorun değil.
    }
  }
}

export function deleteAllAttachments(): void {
  try {
    const dir = new Directory(Paths.document, DIR_NAME);
    if (dir.exists) dir.delete();
  } catch {
    // yoksay
  }
}

export async function readBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

/** Paylaşım için geçici bir metin dosyası oluşturur ve yolunu döndürür. */
export function writeTempFile(name: string, content: string): string {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  return file.uri;
}

export async function readTextFile(uri: string): Promise<string> {
  return new File(uri).text();
}
