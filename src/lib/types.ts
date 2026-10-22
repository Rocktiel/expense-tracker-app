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
  /** Harcamanın düşüldüğü hesap; yoksa bakiye etkilenmez */
  accountId?: string;
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
  /** "Ödendi" denince tutarın düşeceği hesap */
  accountId?: string;
  createdAt: number;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;

export type AccountKind = 'banka' | 'nakit' | 'kart' | 'diger';

/** Bakiye takip edilen hesap: banka hesabı, nakit kasa, kredi kartı... */
export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  /** Hesap uygulamaya eklenirken sahip olduğu bakiye */
  openingBalance: number;
  note?: string;
  createdAt: number;
}

export type IncomeCategory = 'maas' | 'ek' | 'prim' | 'kira' | 'diger';

/** Hesaba giren para: maaş, ek gelir, prim... */
export interface Income {
  id: string;
  title: string;
  amount: number;
  date: number;
  accountId: string;
  category: IncomeCategory;
  note?: string;
  createdAt: number;
}

/** Hesaplar arası para aktarma (ör. bankadan nakit çekme) */
export interface Transfer {
  id: string;
  amount: number;
  date: number;
  fromAccountId: string;
  toAccountId: string;
  note?: string;
  createdAt: number;
}
