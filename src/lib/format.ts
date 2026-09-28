import type { PaymentMethod } from './types';

export const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

export const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'kart', label: 'Kart' },
  { id: 'nakit', label: 'Nakit' },
  { id: 'havale', label: 'Havale/EFT' },
  { id: 'diger', label: 'Diğer' },
];

export function paymentLabel(method?: PaymentMethod): string | undefined {
  return PAYMENT_METHODS.find((m) => m.id === method)?.label;
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1234.5 -> "1.234,50 ₺" */
export function formatMoney(value: number, opts: { decimals?: boolean; symbol?: boolean } = {}): string {
  const { decimals = true, symbol = true } = opts;
  const safe = Number.isFinite(value) ? value : 0;
  const negative = safe < 0;
  const abs = Math.abs(safe);
  let text: string;
  if (decimals) {
    const [i, d] = abs.toFixed(2).split('.');
    text = `${groupThousands(i)},${d}`;
  } else {
    text = groupThousands(Math.round(abs).toString());
  }
  return `${negative ? '-' : ''}${text}${symbol ? ' ₺' : ''}`;
}

/** Grafikler için kısa gösterim: 12500 -> "12,5B" */
export function formatMoneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (abs >= 10_000) return `${Math.round(value / 1000)}B`;
  if (abs >= 1_000) return `${(value / 1000).toFixed(1).replace('.', ',')}B`;
  return Math.round(value).toString();
}

/**
 * Kullanıcının yazdığı tutarı sayıya çevirir.
 * "1.234,56" -> 1234.56, "12,5" -> 12.5, "12.50" -> 12.5, "1.250" -> 1250
 */
export function parseAmount(input: string | number | null | undefined): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : NaN;
  if (!input) return NaN;
  let s = String(input).replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    s = `${s.slice(0, lastComma).replace(/,/g, '')}.${s.slice(lastComma + 1)}`;
  } else if (lastDot >= 0 && /^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

/** Sayıyı düzenleme alanı için metne çevirir: 1234.5 -> "1234,50" */
export function amountToInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toFixed(2).replace('.', ',').replace(/,00$/, '');
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b);
}

/** "25 Eylül 2026" */
export function formatDate(ts: number, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const { weekday = false, year = true } = opts;
  const d = new Date(ts);
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
  return weekday ? `${base}, ${WEEKDAYS[d.getDay()]}` : base;
}

/** "Bugün", "Dün" veya "25 Eylül 2026" */
export function formatRelativeDay(ts: number, opts: { weekday?: boolean } = {}): string {
  const now = Date.now();
  if (isSameDay(ts, now)) return 'Bugün';
  if (isSameDay(ts, now - 86_400_000)) return 'Dün';
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return formatDate(ts, { weekday: opts.weekday, year: !sameYear });
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM" */
export function monthKey(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string, withYear = true): string {
  const [y, m] = key.split('-').map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

/** a'dan b'ye kaç ay var: monthDiff("2026-01", "2026-03") = 2 */
export function monthDiff(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  return by * 12 + bm - (ay * 12 + am);
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

/** "2026-09-25" + "14:30" -> yerel saatle timestamp. Geçersizse undefined. */
export function parseIsoDate(date?: string, time?: string): number | undefined {
  if (!date) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return undefined;
  const [, y, mo, d] = m.map(Number);
  let hh = 12;
  let mm = 0;
  const t = time ? /^(\d{1,2})[:.](\d{2})/.exec(time.trim()) : null;
  if (t) {
    hh = Math.min(23, Number(t[1]));
    mm = Math.min(59, Number(t[2]));
  }
  const result = new Date(y, mo - 1, d, hh, mm, 0, 0);
  if (result.getMonth() !== mo - 1 || result.getDate() !== d) return undefined;
  return result.getTime();
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Türkçe'ye duyarlı küçük harfe çevirip arama için sadeleştirir */
export function normalizeSearch(text: string): string {
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}
