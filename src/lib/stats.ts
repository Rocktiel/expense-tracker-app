import { CATEGORIES, type CategoryId } from './categories';
import { monthDiff, monthKey, normalizeSearch, shiftMonth } from './format';
import type { Expense, RecurringPayment } from './types';

export function expensesInMonth(expenses: Expense[], key: string): Expense[] {
  return expenses.filter((e) => monthKey(e.date) === key);
}

export function sumAmounts(expenses: Expense[]): number {
  return Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
}

export interface CategoryTotal {
  id: CategoryId;
  total: number;
  count: number;
  share: number;
}

export function totalsByCategory(expenses: Expense[]): CategoryTotal[] {
  const map = new Map<CategoryId, { total: number; count: number }>();
  for (const e of expenses) {
    const id = CATEGORIES[e.category] ? e.category : 'diger';
    const cur = map.get(id) ?? { total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    map.set(id, cur);
  }
  const grand = sumAmounts(expenses) || 1;
  return [...map.entries()]
    .map(([id, v]) => ({ id, total: v.total, count: v.count, share: v.total / grand }))
    .sort((a, b) => b.total - a.total);
}

export function monthlyTotals(expenses: Expense[], endKey: string, count: number): { key: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    const k = monthKey(e.date);
    totals.set(k, (totals.get(k) ?? 0) + e.amount);
  }
  const result: { key: string; total: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftMonth(endKey, -i);
    result.push({ key, total: totals.get(key) ?? 0 });
  }
  return result;
}

export function topMerchants(expenses: Expense[], limit = 5): { title: string; total: number; count: number }[] {
  const map = new Map<string, { title: string; total: number; count: number }>();
  for (const e of expenses) {
    const key = normalizeSearch(e.title);
    const cur = map.get(key) ?? { title: e.title, total: 0, count: 0 };
    cur.total += e.amount;
    cur.count += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export interface Installment {
  /** Bu ay kaçıncı taksit (1'den başlar) */
  current: number;
  total: number;
}

export type RecurringStatus = 'active' | 'notStarted' | 'finished';

export function recurringStartMonth(item: RecurringPayment): string {
  return item.startMonth ?? monthKey(item.createdAt);
}

/** Son ödeme ayı; süresizse undefined */
export function recurringEndMonth(item: RecurringPayment): string | undefined {
  return item.totalMonths ? shiftMonth(recurringStartMonth(item), item.totalMonths - 1) : undefined;
}

export function recurringStatus(item: RecurringPayment, key: string): RecurringStatus {
  const index = monthDiff(recurringStartMonth(item), key);
  if (index < 0) return 'notStarted';
  if (item.totalMonths && index >= item.totalMonths) return 'finished';
  return 'active';
}

/** Verilen ay için taksit bilgisi; süresiz ödemelerde veya aralık dışında undefined */
export function installmentFor(item: RecurringPayment, key: string): Installment | undefined {
  if (!item.totalMonths) return undefined;
  const index = monthDiff(recurringStartMonth(item), key);
  if (index < 0 || index >= item.totalMonths) return undefined;
  return { current: index + 1, total: item.totalMonths };
}

export interface UpcomingPayment {
  item: RecurringPayment;
  paid: boolean;
  /** Bu ayki ödeme gününe kalan gün (negatifse gecikmiş) */
  daysLeft: number;
  status: RecurringStatus;
  installment?: Installment;
}

const STATUS_ORDER: Record<RecurringStatus, number> = { active: 0, notStarted: 1, finished: 2 };

export function upcomingPayments(recurring: RecurringPayment[], now = new Date()): UpcomingPayment[] {
  const key = monthKey(now);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return recurring
    .map((item) => {
      const day = Math.min(Math.max(1, item.dayOfMonth), lastDay);
      const due = new Date(now.getFullYear(), now.getMonth(), day).getTime();
      return {
        item,
        paid: item.lastPaidMonth === key,
        daysLeft: Math.round((due - today) / 86_400_000),
        status: recurringStatus(item, key),
        installment: installmentFor(item, key),
      };
    })
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || Number(a.paid) - Number(b.paid) || a.daysLeft - b.daysLeft,
    );
}

/** Aynı gün, aynı tutarda ve benzer isimde kayıt var mı? (Aynı fişi iki kez eklemeyi önlemek için) */
export function findDuplicate(expenses: Expense[], candidate: { title: string; amount: number; date: number }) {
  const day = new Date(candidate.date).toDateString();
  const title = normalizeSearch(candidate.title);
  return expenses.find(
    (e) =>
      Math.abs(e.amount - candidate.amount) < 0.01 &&
      new Date(e.date).toDateString() === day &&
      (normalizeSearch(e.title) === title ||
        normalizeSearch(e.title).includes(title) ||
        title.includes(normalizeSearch(e.title))),
  );
}
