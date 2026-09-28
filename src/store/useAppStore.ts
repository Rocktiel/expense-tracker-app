import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { attachmentExists, deleteAllAttachments, deleteAttachments } from '@/lib/files';
import { monthKey, newId } from '@/lib/format';
import { installmentFor, recurringStatus } from '@/lib/stats';
import { DEFAULT_MODEL } from '@/lib/gemini';
import type { Expense, ExpenseInput, RecurringPayment } from '@/lib/types';

export interface BackupData {
  app: 'gider-defteri';
  version: 1;
  exportedAt: number;
  userName: string;
  monthlyBudget: number | null;
  expenses: Expense[];
  recurring: RecurringPayment[];
}

interface AppState {
  userName: string;
  monthlyBudget: number | null;
  geminiModel: string;
  expenses: Expense[];
  recurring: RecurringPayment[];

  setUserName: (name: string) => void;
  setMonthlyBudget: (value: number | null) => void;
  setGeminiModel: (model: string) => void;

  addExpense: (input: ExpenseInput) => Expense;
  addExpenses: (inputs: ExpenseInput[]) => void;
  updateExpense: (id: string, patch: Partial<ExpenseInput>) => void;
  deleteExpense: (id: string) => void;

  addRecurring: (input: Omit<RecurringPayment, 'id' | 'createdAt'>) => RecurringPayment;
  updateRecurring: (id: string, patch: Partial<Omit<RecurringPayment, 'id' | 'createdAt'>>) => void;
  deleteRecurring: (id: string) => void;
  /** Düzenli ödemeyi bu ay için ödendi yapar ve gider olarak ekler */
  markRecurringPaid: (id: string) => void;
  /** Bu ayki ödeme işaretini ve oluşan gideri geri alır */
  undoRecurringPaid: (id: string) => void;

  exportBackup: () => BackupData;
  importBackup: (data: BackupData) => void;
  resetAll: () => void;
}

function sortByDateDesc(list: Expense[]): Expense[] {
  return [...list].sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
}

function makeExpense(input: ExpenseInput): Expense {
  return { ...input, id: newId(), createdAt: Date.now() };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      userName: '',
      monthlyBudget: null,
      geminiModel: DEFAULT_MODEL,
      expenses: [],
      recurring: [],

      setUserName: (userName) => set({ userName: userName.trim() }),
      setMonthlyBudget: (monthlyBudget) => set({ monthlyBudget }),
      setGeminiModel: (geminiModel) => set({ geminiModel }),

      addExpense: (input) => {
        const expense = makeExpense(input);
        set((s) => ({ expenses: sortByDateDesc([expense, ...s.expenses]) }));
        return expense;
      },
      addExpenses: (inputs) => {
        const created = inputs.map(makeExpense);
        set((s) => ({ expenses: sortByDateDesc([...created, ...s.expenses]) }));
      },
      updateExpense: (id, patch) =>
        set((s) => ({
          expenses: sortByDateDesc(s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e))),
        })),
      deleteExpense: (id) => {
        const target = get().expenses.find((e) => e.id === id);
        if (!target) return;
        deleteAttachments(target.attachments);
        set((s) => {
          const recurring =
            target.recurringId && monthKey(target.date) === monthKey(Date.now())
              ? s.recurring.map((r) =>
                  r.id === target.recurringId && r.lastPaidMonth === monthKey(target.date)
                    ? { ...r, lastPaidMonth: undefined }
                    : r,
                )
              : s.recurring;
          return { expenses: s.expenses.filter((e) => e.id !== id), recurring };
        });
      },

      addRecurring: (input) => {
        const item: RecurringPayment = { ...input, id: newId(), createdAt: Date.now() };
        set((s) => ({ recurring: [...s.recurring, item] }));
        return item;
      },
      updateRecurring: (id, patch) =>
        set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecurring: (id) => set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),
      markRecurringPaid: (id) => {
        const item = get().recurring.find((r) => r.id === id);
        if (!item) return;
        const current = monthKey(Date.now());
        if (item.lastPaidMonth === current || recurringStatus(item, current) !== 'active') return;
        const installment = installmentFor(item, current);
        const note = [installment ? `${installment.current}/${installment.total}. taksit` : '', item.note ?? '']
          .filter(Boolean)
          .join(' · ');
        const expense = makeExpense({
          title: item.title,
          amount: item.amount,
          date: Date.now(),
          category: item.category,
          note: note || undefined,
          source: 'recurring',
          recurringId: item.id,
        });
        set((s) => ({
          expenses: sortByDateDesc([expense, ...s.expenses]),
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, lastPaidMonth: current } : r)),
        }));
      },
      undoRecurringPaid: (id) => {
        const current = monthKey(Date.now());
        set((s) => {
          const paid = s.expenses.find(
            (e) => e.recurringId === id && e.source === 'recurring' && monthKey(e.date) === current,
          );
          return {
            expenses: paid ? s.expenses.filter((e) => e.id !== paid.id) : s.expenses,
            recurring: s.recurring.map((r) => (r.id === id ? { ...r, lastPaidMonth: undefined } : r)),
          };
        });
      },

      exportBackup: () => {
        const s = get();
        return {
          app: 'gider-defteri',
          version: 1,
          exportedAt: Date.now(),
          userName: s.userName,
          monthlyBudget: s.monthlyBudget,
          expenses: s.expenses,
          recurring: s.recurring,
        };
      },
      importBackup: (data) => {
        // Yedekte fotoğraflar yok; sadece bu telefonda hâlâ duran dosyaları koru
        const expenses = data.expenses.map((e) => {
          const attachments = e.attachments?.filter(attachmentExists);
          return { ...e, attachments: attachments && attachments.length ? attachments : undefined };
        });
        const keep = new Set(expenses.flatMap((e) => e.attachments ?? []));
        deleteAttachments(get().expenses.flatMap((e) => e.attachments ?? []).filter((n) => !keep.has(n)));
        set({
          userName: data.userName || get().userName,
          monthlyBudget: data.monthlyBudget ?? null,
          expenses: sortByDateDesc(expenses),
          recurring: data.recurring,
        });
      },
      resetAll: () => {
        deleteAllAttachments();
        set({ userName: '', monthlyBudget: null, geminiModel: DEFAULT_MODEL, expenses: [], recurring: [] });
      },
    }),
    {
      name: 'gider-defteri-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        userName: s.userName,
        monthlyBudget: s.monthlyBudget,
        geminiModel: s.geminiModel,
        expenses: s.expenses,
        recurring: s.recurring,
      }),
    },
  ),
);

export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Partial<BackupData>;
  return (
    d.app === 'gider-defteri' &&
    Array.isArray(d.expenses) &&
    Array.isArray(d.recurring) &&
    d.expenses.every(
      (e) => e && typeof e.id === 'string' && typeof e.amount === 'number' && typeof e.date === 'number',
    )
  );
}

/** Kayıtlı veriler telefondan yüklenene kadar false döner. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useAppStore.persist.onFinishHydration(onChange),
    () => useAppStore.persist.hasHydrated(),
  );
}
