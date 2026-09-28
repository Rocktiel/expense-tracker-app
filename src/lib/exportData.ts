import * as Sharing from 'expo-sharing';

import { getCategory } from './categories';
import { writeTempFile } from './files';
import { formatDate, formatTime, paymentLabel } from './format';
import type { Expense } from './types';

function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Türkçe Excel ondalık için virgül kullandığından ayraç olarak ";" kullanılır. */
export function buildCsv(expenses: Expense[]): string {
  const header = ['Tarih', 'Saat', 'Başlık', 'Kategori', 'Tutar (TL)', 'Ödeme', 'Not', 'Kalemler'];
  const rows = expenses.map((e) => [
    formatDate(e.date),
    formatTime(e.date),
    e.title,
    getCategory(e.category).label,
    e.amount.toFixed(2).replace('.', ','),
    paymentLabel(e.paymentMethod) ?? '',
    e.note ?? '',
    (e.items ?? []).map((i) => `${i.name} (${i.price.toFixed(2).replace('.', ',')})`).join(', '),
  ]);
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
}

export async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Bu cihazda paylaşım desteklenmiyor.');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
}

export async function shareCsv(expenses: Expense[]): Promise<void> {
  const date = new Date();
  const name = `giderler-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.csv`;
  const uri = writeTempFile(name, buildCsv(expenses));
  await shareFile(uri, 'text/csv', 'Giderleri paylaş');
}

export async function shareJson(fileName: string, data: unknown): Promise<void> {
  const uri = writeTempFile(fileName, JSON.stringify(data, null, 2));
  await shareFile(uri, 'application/json', 'Yedeği kaydet');
}
