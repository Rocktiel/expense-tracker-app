import { CATEGORY_IDS, CATEGORY_LIST, isCategoryId, type CategoryId } from './categories';
import { parseAmount, parseIsoDate } from './format';
import type { LineItem, PaymentMethod } from './types';

export const GEMINI_MODELS: { id: string; label: string; description: string }[] = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', description: 'Önerilen · En hızlı (Şimşek hızında)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', description: 'En güncel ve isabetli' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', description: 'Kararlı alternatif' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite', description: 'Yedek hızlı model' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Yedek kararlı model' },
];

export const DEFAULT_MODEL = GEMINI_MODELS[0].id;

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_PAYLOAD_CHARS = 18 * 1024 * 1024;

export type ScanMode = 'auto' | 'single';

export interface ScanPart {
  base64: string;
  mimeType: string;
}

export interface ParsedReceipt {
  merchant: string;
  total: number;
  date?: number;
  category: CategoryId;
  paymentMethod?: PaymentMethod;
  items: LineItem[];
  fileIndexes: number[];
  note?: string;
}

export type GeminiErrorKind =
  | 'no_key'
  | 'bad_key'
  | 'quota'
  | 'model'
  | 'network'
  | 'timeout'
  | 'server'
  | 'too_large'
  | 'blocked'
  | 'parse';

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'GeminiError';
  }
}

/**
 * Fotoğrafları göndermeden önce 1200px ve %75 JPEG kalitesine küçültür.
 * 5-10 MB'lık kamera fotoğraflarını ~200 KB'a düşürerek yükleme süresini 15 saniyeden 0.5 saniyeye indirir.
 */
async function compressScanPart(
  part: ScanPart,
  maxDimension = 1200,
  quality = 0.75,
): Promise<ScanPart> {
  if (!part.mimeType.startsWith('image/') || typeof document === 'undefined') {
    return part;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(part);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];

      resolve({
        base64: base64 || part.base64,
        mimeType: 'image/jpeg',
      });
    };

    img.onerror = () => resolve(part);
    img.src = `data:${part.mimeType};base64,${part.base64}`;
  });
}

function buildPrompt(mode: ScanMode, fileCount: number): string {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const categoryGuide = CATEGORY_LIST.map((c) => `- ${c.id}: ${c.hint}`).join('\n');

  const modeText =
    mode === 'single'
      ? `All ${fileCount} images are consecutive photos of ONE single long receipt/document, ordered from top to bottom. ` +
        'Consecutive photos may overlap: an item visible at the bottom of one photo and the top of the next must be counted ONLY ONCE. ' +
        'Return exactly one receipt that combines all parts.'
      : 'The images may contain one or more different receipts, invoices or bills. One image can contain several receipts, ' +
        'and a single long receipt can continue across consecutive images (merge those and do not duplicate overlapping lines). ' +
        'Return one entry per real-world receipt.';

  return `You are an expert at reading Turkish receipts (fiş), invoices (fatura) and bills. Today is ${today}.

${modeText}

Rules:
- total: the final amount paid (look for "TOPLAM", "GENEL TOPLAM", "ÖDENECEK TUTAR", "TUTAR"). Never use the VAT line ("TOPKDV", "KDV") as total.
- Turkish number format uses "." for thousands and "," for decimals ("1.234,56" = 1234.56). Output numbers with a dot decimal.
- items: list every purchased line with its line total. Quantity lines like "2 X 12,50" mean quantity 2. Discounts ("İNDİRİM", "İND.") are items with a negative price. Do not include subtotal, VAT, total, change ("PARA ÜSTÜ") or payment lines as items. For bills/loans with no product lines, return a single descriptive item or an empty list.
- date: prefer the transaction date. If the year is missing, assume the most recent past date relative to today. Use empty string if unknown.
- paymentMethod: "kart" for credit/debit card (KREDİ KARTI, BANKA KARTI, POS), "nakit" for cash (NAKİT), "havale" for bank transfer, otherwise "bilinmiyor".
- category: choose the best fitting id:
${categoryGuide}
- merchant: short clean name without legal suffixes like "A.Ş.", "LTD. ŞTİ.", "TİC.".
- Keep item names in the original language (Turkish) but fix obvious OCR errors and use normal capitalization.
- If an image is not a receipt or is unreadable, ignore it. If nothing is readable, return an empty receipts array.

Return ONLY JSON in this shape:
{"receipts":[{"merchant":"Migros","total":245.9,"date":"2026-01-31","time":"18:42","category":"market","paymentMethod":"kart","items":[{"name":"Süt 1L","quantity":2,"price":59.9}],"imageNumbers":[1],"note":""}]}`;
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { code?: number; message?: string; status?: string };
}

type GenerationVariant = Record<string, unknown>;

/**
 * 1. Öncelik: thinkingBudget: 0 ile düşünmeyi tamamen kapatır (En hızlısı).
 * 2. Yedek: Eğer seçilen model thinkingBudget: 0 kabul etmezse, en düşük düşünme seviyesi (LOW) veya standart JSON döner.
 */
const GENERATION_VARIANTS: GenerationVariant[] = [
  {
    responseMimeType: 'application/json',
    temperature: 0.1,
    thinkingConfig: { thinkingBudget: 0 },
  },
  {
    responseMimeType: 'application/json',
    temperature: 0.1,
  },
];

async function post(apiKey: string, model: string, body: unknown): Promise<{ status: number; json: GeminiResponse }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json: GeminiResponse = {};
    try {
      json = (await res.json()) as GeminiResponse;
    } catch {
      json = {};
    }
    return { status: res.status, json };
  } catch {
    if (controller.signal.aborted) {
      throw new GeminiError('timeout', 'İstek çok uzun sürdü. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    }
    throw new GeminiError('network', 'İnternete bağlanılamadı. Bağlantınızı kontrol edip tekrar deneyin.');
  } finally {
    clearTimeout(timer);
  }
}

function errorFromResponse(status: number, json: GeminiResponse, model: string): GeminiError {
  const message = json.error?.message ?? '';
  const lower = message.toLowerCase();
  if (lower.includes('api key') || lower.includes('api_key') || status === 401) {
    return new GeminiError('bad_key', 'Gemini API anahtarı geçersiz. Ayarlar ekranından anahtarı kontrol edin.');
  }
  if (status === 429) {
    return new GeminiError('quota', 'Gemini kullanım sınırına ulaşıldı. Biraz bekleyip tekrar deneyin.');
  }
  if (status === 404 || lower.includes('not found')) {
    return new GeminiError('model', `"${model}" modeli bulunamadı. Ayarlardan başka bir model seçin.`);
  }
  if (status === 403) {
    return new GeminiError('bad_key', 'Bu API anahtarının Gemini erişim izni yok. Ayarlardan anahtarı kontrol edin.');
  }
  if (status === 413) {
    return new GeminiError('too_large', 'Dosyalar çok büyük. Daha az fotoğrafla tekrar deneyin.');
  }
  if (status >= 500) {
    return new GeminiError('server', 'Gemini servisi şu an yoğun. Birazdan tekrar deneyin.');
  }
  return new GeminiError('server', message ? `Gemini hatası: ${message}` : `Beklenmeyen hata (${status}).`);
}

function isConfigRejection(status: number, json: GeminiResponse): boolean {
  if (status !== 400) return false;
  const lower = (json.error?.message ?? '').toLowerCase();
  if (lower.includes('api key')) return false;
  return (
    lower.includes('thinking') ||
    lower.includes('budget') ||
    lower.includes('unknown name') ||
    lower.includes('invalid argument') ||
    lower.includes('not supported')
  );
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function generate(apiKey: string, model: string, parts: unknown[]): Promise<string> {
  // Eğer telefonun hafızasında eski/geçersiz bir model adı kaldıysa otomatik varsayılan modele geç
  const activeModel = GEMINI_MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL;
  let lastError: GeminiError | null = null;

  for (const generationConfig of GENERATION_VARIANTS) {
    const body = { contents: [{ role: 'user', parts }], generationConfig };

    let attempt = 0;
    while (attempt < 2) {
      const { status, json } = await post(apiKey, activeModel, body);

      if (status >= 200 && status < 300) {
        if (json.promptFeedback?.blockReason) {
          throw new GeminiError('blocked', 'Görsel işlenemedi. Farklı bir fotoğraf deneyin.');
        }
        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .filter((p) => !p.thought && typeof p.text === 'string')
          .map((p) => p.text)
          .join('');
        if (!text.trim()) {
          throw new GeminiError('parse', 'Fişten sonuç alınamadı. Daha net bir fotoğrafla tekrar deneyin.');
        }
        return text;
      }

      if ((status >= 500 || status === 429) && attempt === 0) {
        attempt += 1;
        await delay(status === 429 ? 4000 : 2000);
        continue;
      }

      if (isConfigRejection(status, json)) {
        lastError = errorFromResponse(status, json, activeModel);
        break; // thinkingBudget desteklemiyorsa 2. varyanta geç
      }

      throw errorFromResponse(status, json, activeModel);
    }
  }

  throw lastError ?? new GeminiError('server', 'Gemini isteği başarısız oldu.');
}

function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseAmount(value);
  return NaN;
}

const PAYMENT_VALUES: PaymentMethod[] = ['kart', 'nakit', 'havale', 'diger'];

function normalizeReceipts(raw: unknown, fileCount: number, mode: ScanMode): ParsedReceipt[] {
  const list = (raw as { receipts?: unknown })?.receipts;
  if (!Array.isArray(list)) return [];

  const receipts: ParsedReceipt[] = [];
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const r = entry as Record<string, unknown>;

    const items: LineItem[] = Array.isArray(r.items)
      ? (r.items as Record<string, unknown>[])
          .map((it) => {
            const price = Math.round(toNumber(it?.price) * 100) / 100;
            const quantity = toNumber(it?.quantity);
            const name = typeof it?.name === 'string' ? it.name.trim() : '';
            const item: LineItem = { name, price };
            if (Number.isFinite(quantity) && quantity > 0 && quantity !== 1) item.quantity = quantity;
            return item;
          })
          .filter((it) => it.name && Number.isFinite(it.price))
      : [];

    let total = Math.round(toNumber(r.total) * 100) / 100;
    if (!Number.isFinite(total) || total <= 0) {
      const sum = items.reduce((s, it) => s + it.price, 0);
      total = Math.round(sum * 100) / 100;
    }
    if (!Number.isFinite(total) || total <= 0) continue;

    const fileIndexes = Array.isArray(r.imageNumbers)
      ? Array.from(
          new Set(
            (r.imageNumbers as unknown[])
              .map((n) => Math.round(toNumber(n)) - 1)
              .filter((n) => Number.isInteger(n) && n >= 0 && n < fileCount),
          ),
        ).sort((a, b) => a - b)
      : [];

    const payment = typeof r.paymentMethod === 'string' ? r.paymentMethod : '';
    const note = typeof r.note === 'string' ? r.note.trim() : '';
    const merchant = typeof r.merchant === 'string' && r.merchant.trim() ? r.merchant.trim() : 'Fiş';

    receipts.push({
      merchant,
      total,
      date: parseIsoDate(typeof r.date === 'string' ? r.date : undefined, typeof r.time === 'string' ? r.time : undefined),
      category: isCategoryId(r.category) ? r.category : 'diger',
      paymentMethod: (PAYMENT_VALUES as string[]).includes(payment) ? (payment as PaymentMethod) : undefined,
      items,
      fileIndexes,
      note: note || undefined,
    });
  }

  const allIndexes = Array.from({ length: fileCount }, (_, i) => i);
  if (mode === 'single' || receipts.length === 1) {
    for (const r of receipts) if (r.fileIndexes.length === 0) r.fileIndexes = allIndexes;
  }
  return receipts;
}

export async function analyzeReceipts(options: {
  apiKey: string | null;
  model: string;
  files: ScanPart[];
  mode: ScanMode;
}): Promise<ParsedReceipt[]> {
  const { apiKey, model, files, mode } = options;
  if (!apiKey) {
    throw new GeminiError('no_key', 'Fiş okumak için önce Ayarlar ekranından Gemini API anahtarınızı girin.');
  }
  if (files.length === 0) return [];

  // Fotoğrafları göndermeden önce otomatik küçült
  const compressedFiles = await Promise.all(files.map((f) => compressScanPart(f)));

  const size = compressedFiles.reduce((s, f) => s + f.base64.length, 0);
  if (size > MAX_PAYLOAD_CHARS) {
    throw new GeminiError('too_large', 'Seçilen dosyalar çok büyük. Lütfen daha az fotoğraf seçin.');
  }

  const parts: unknown[] = [{ text: buildPrompt(mode, compressedFiles.length) }];
  compressedFiles.forEach((file, index) => {
    parts.push({ text: `IMAGE ${index + 1}:` });
    parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 } });
  });

  const text = await generate(apiKey.trim(), model || DEFAULT_MODEL, parts);

  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch {
    throw new GeminiError('parse', 'Fiş okunurken bir sorun oldu. Lütfen tekrar deneyin.');
  }
  return normalizeReceipts(raw, compressedFiles.length, mode);
}

/** Ayarlar ekranındaki "Anahtarı test et" butonu için. */
export async function testApiKey(apiKey: string, model: string): Promise<void> {
  if (!apiKey.trim()) throw new GeminiError('no_key', 'Önce bir API anahtarı girin.');
  const activeModel = GEMINI_MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL;
  const body = {
    contents: [{ role: 'user', parts: [{ text: 'Sadece "tamam" yaz.' }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  };
  const { status, json } = await post(apiKey.trim(), activeModel, body);
  if (status < 200 || status >= 300) throw errorFromResponse(status, json, activeModel);
}