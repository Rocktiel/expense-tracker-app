import { create } from 'zustand';

import type { ParsedReceipt } from '@/lib/gemini';

export interface ScanFile {
  /** Geçici (önbellek) dosya yolu */
  uri: string;
  kind: 'image' | 'pdf';
  name?: string;
}

/** Tarama sonucu, kaydetmeden önce kullanıcının kontrol ettiği geçici veriler. Diske yazılmaz. */
interface ScanState {
  files: ScanFile[];
  receipts: ParsedReceipt[];
  setResult: (files: ScanFile[], receipts: ParsedReceipt[]) => void;
  clear: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  files: [],
  receipts: [],
  setResult: (files, receipts) => set({ files, receipts }),
  clear: () => set({ files: [], receipts: [] }),
}));
