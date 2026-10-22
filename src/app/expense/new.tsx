import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { ExpenseForm } from '@/components/ExpenseForm';
import { monthKey } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';

export default function NewExpense() {
  const addExpense = useAppStore((s) => s.addExpense);
  const addRecurring = useAppStore((s) => s.addRecurring);

  return (
    <ExpenseForm
      title="Gider Ekle"
      submitLabel="Kaydet"
      allowRepeat
      onSubmit={(values, { repeat }) => {
        let recurringId: string | undefined;
        let note = values.note;
        if (repeat) {
          // Girilen harcama ilk ödeme sayılır; tekrarlama o aydan başlar
          const startMonth = monthKey(values.date);
          const paidThisMonth = startMonth === monthKey(Date.now());
          const item = addRecurring({
            title: values.title,
            amount: values.amount,
            category: values.category,
            dayOfMonth: new Date(values.date).getDate(),
            note: values.note,
            startMonth,
            totalMonths: repeat.totalMonths ?? undefined,
            accountId: values.accountId,
            lastPaidMonth: paidThisMonth ? startMonth : undefined,
          });
          if (paidThisMonth) recurringId = item.id;
          if (repeat.totalMonths) note = [`1/${repeat.totalMonths}. taksit`, values.note].filter(Boolean).join(' · ');
        }
        addExpense({ ...values, note, source: 'manual', recurringId });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        router.back();
      }}
    />
  );
}
