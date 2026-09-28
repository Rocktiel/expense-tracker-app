import { router, useLocalSearchParams } from 'expo-router';

import { ExpenseForm } from '@/components/ExpenseForm';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function EditExpense() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useAppStore((s) => s.expenses.find((e) => e.id === id));
  const updateExpense = useAppStore((s) => s.updateExpense);

  if (!expense) {
    return (
      <Screen title="Düzenle">
        <EmptyState icon="alert-circle-outline" title="Kayıt bulunamadı">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <ExpenseForm
      title="Düzenle"
      initial={expense}
      submitLabel="Değişiklikleri kaydet"
      onSubmit={(values) => {
        updateExpense(expense.id, values);
        router.back();
      }}
    />
  );
}
