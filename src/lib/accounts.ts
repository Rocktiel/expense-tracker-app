import type { IconName } from './categories';
import { monthKey } from './format';
import type { Account, AccountKind, Expense, Income, IncomeCategory, Transfer } from './types';

/* ------------------------------------------------------------------ */
/* Hesap türleri                                                        */
/* ------------------------------------------------------------------ */

export interface AccountKindInfo {
  id: AccountKind;
  label: string;
  icon: IconName;
  color: string;
  /** Yeni hesap formunda örnek isim */
  placeholder: string;
}

export const ACCOUNT_KINDS: AccountKindInfo[] = [
  { id: 'banka', label: 'Banka', icon: 'business', color: '#60A5FA', placeholder: 'Örn: Garanti, Ziraat' },
  { id: 'nakit', label: 'Nakit', icon: 'cash', color: '#34D399', placeholder: 'Örn: Cüzdan, Kasa' },
  { id: 'kart', label: 'Kredi kartı', icon: 'card', color: '#F87171', placeholder: 'Örn: Bonus kart' },
  { id: 'diger', label: 'Diğer', icon: 'wallet', color: '#9AA8B9', placeholder: 'Örn: Birikim' },
];

export function accountKindInfo(kind: AccountKind | string | undefined): AccountKindInfo {
  return ACCOUNT_KINDS.find((k) => k.id === kind) ?? ACCOUNT_KINDS[ACCOUNT_KINDS.length - 1];
}

/* ------------------------------------------------------------------ */
/* Gelir türleri                                                        */
/* ------------------------------------------------------------------ */

export interface IncomeCategoryInfo {
  id: IncomeCategory;
  label: string;
  icon: IconName;
  color: string;
}

export const INCOME_CATEGORIES: IncomeCategoryInfo[] = [
  { id: 'maas', label: 'Maaş', icon: 'cash', color: '#34D399' },
  { id: 'ek', label: 'Ek gelir', icon: 'add-circle', color: '#60A5FA' },
  { id: 'prim', label: 'Prim / ikramiye', icon: 'trophy', color: '#FBBF24' },
  { id: 'kira', label: 'Kira / faiz', icon: 'home', color: '#A78BFA' },
  { id: 'diger', label: 'Diğer', icon: 'ellipsis-horizontal', color: '#94A3B8' },
];

export function incomeCategoryInfo(id: IncomeCategory | string | undefined): IncomeCategoryInfo {
  return INCOME_CATEGORIES.find((c) => c.id === id) ?? INCOME_CATEGORIES[INCOME_CATEGORIES.length - 1];
}

/* ------------------------------------------------------------------ */
/* Bakiye hesapları                                                     */
/* ------------------------------------------------------------------ */

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function accountName(accounts: Account[], id: string | undefined): string | undefined {
  if (!id) return undefined;
  return accounts.find((a) => a.id === id)?.name ?? 'Silinmiş hesap';
}

/**
 * Hesabın güncel bakiyesi: başlangıç bakiyesi + gelirler - giderler
 * + gelen transferler - giden transferler. Tüm zamanlar hesaba katılır;
 * bir gider düzenlenince veya silinince bakiye kendiliğinden düzelir.
 */
export function accountBalance(
  account: Account,
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
): number {
  let balance = account.openingBalance;
  for (const e of expenses) if (e.accountId === account.id) balance -= e.amount;
  for (const i of incomes) if (i.accountId === account.id) balance += i.amount;
  for (const t of transfers) {
    if (t.fromAccountId === account.id) balance -= t.amount;
    if (t.toAccountId === account.id) balance += t.amount;
  }
  return roundMoney(balance);
}

export function totalBalance(
  accounts: Account[],
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
): number {
  return roundMoney(
    accounts.reduce((sum, account) => sum + accountBalance(account, expenses, incomes, transfers), 0),
  );
}

export interface AccountSummary {
  account: Account;
  balance: number;
  /** Seçilen ayda hesaba giren para */
  monthIn: number;
  /** Seçilen ayda hesaptan çıkan para */
  monthOut: number;
}

export function accountSummaries(
  accounts: Account[],
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
  month?: string,
): AccountSummary[] {
  return accounts.map((account) => {
    let balance = account.openingBalance;
    let monthIn = 0;
    let monthOut = 0;

    for (const e of expenses) {
      if (e.accountId !== account.id) continue;
      balance -= e.amount;
      if (month && monthKey(e.date) === month) monthOut += e.amount;
    }
    for (const i of incomes) {
      if (i.accountId !== account.id) continue;
      balance += i.amount;
      if (month && monthKey(i.date) === month) monthIn += i.amount;
    }
    for (const t of transfers) {
      if (t.fromAccountId === account.id) {
        balance -= t.amount;
        if (month && monthKey(t.date) === month) monthOut += t.amount;
      }
      if (t.toAccountId === account.id) {
        balance += t.amount;
        if (month && monthKey(t.date) === month) monthIn += t.amount;
      }
    }

    return {
      account,
      balance: roundMoney(balance),
      monthIn: roundMoney(monthIn),
      monthOut: roundMoney(monthOut),
    };
  });
}

/* ------------------------------------------------------------------ */
/* Hesap hareketleri                                                    */
/* ------------------------------------------------------------------ */

export type Movement =
  | { kind: 'expense'; id: string; date: number; amount: number; expense: Expense }
  | { kind: 'income'; id: string; date: number; amount: number; income: Income }
  | {
      kind: 'transfer';
      id: string;
      date: number;
      amount: number;
      direction: 'in' | 'out';
      transfer: Transfer;
    };

/** Hesaba ait gider, gelir ve transferleri tek listede, yeniden eskiye döndürür. */
export function accountMovements(
  accountId: string,
  expenses: Expense[],
  incomes: Income[],
  transfers: Transfer[],
): Movement[] {
  const list: Movement[] = [
    ...expenses
      .filter((e) => e.accountId === accountId)
      .map<Movement>((expense) => ({ kind: 'expense', id: expense.id, date: expense.date, amount: expense.amount, expense })),
    ...incomes
      .filter((i) => i.accountId === accountId)
      .map<Movement>((income) => ({ kind: 'income', id: income.id, date: income.date, amount: income.amount, income })),
    ...transfers
      .filter((t) => t.fromAccountId === accountId || t.toAccountId === accountId)
      .map<Movement>((transfer) => ({
        kind: 'transfer',
        id: transfer.id,
        date: transfer.date,
        amount: transfer.amount,
        direction: transfer.toAccountId === accountId ? 'in' : 'out',
        transfer,
      })),
  ];
  return list.sort((a, b) => b.date - a.date);
}
