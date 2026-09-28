import type { CategoryId } from './categories';

export type PaymentMethod = 'nakit' | 'kart' | 'havale' | 'diger';

export type ExpenseSource = 'manual' | 'scan' | 'recurring';

export interface LineItem {
  name: string;
  quantity?: number;
  price: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  /** Harcama zamanı (ms) */
  date: number;
  category: CategoryId;
  paymentMethod?: PaymentMethod;
  note?: string;
  items?: LineItem[];
  /** Belgeler klasöründeki dosya adları (fiş fotoğrafları / PDF) */
  attachments?: string[];
  source: ExpenseSource;
  recurringId?: string;
  createdAt: number;
}

export interface RecurringPayment {
  id: string;
  title: string;
  amount: number;
  category: CategoryId;
  /** Ayın kaçında ödeniyor (1-31) */
  dayOfMonth: number;
  note?: string;
  /** En son ödendiği ay, "YYYY-MM" */
  lastPaidMonth?: string;
  /** İlk ödeme ayı, "YYYY-MM". Eski kayıtlarda yoksa oluşturulma ayı kabul edilir. */
  startMonth?: string;
  /** Toplam kaç ay sürecek (taksit sayısı). Yoksa süresiz. */
  totalMonths?: number;
  createdAt: number;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
