import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { IncomeForm } from '@/components/IncomeForm';
import { Button, EmptyState, Screen } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';

export default function EditIncome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const income = useAppStore((s) => s.incomes.find((i) => i.id === id));
  const updateIncome = useAppStore((s) => s.updateIncome);
  const deleteIncome = useAppStore((s) => s.deleteIncome);

  if (!income) {
    return (
      <Screen title="Geliri Düzenle">
        <EmptyState icon="cash-outline" title="Gelir kaydı bulunamadı">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <IncomeForm
      title="Geliri Düzenle"
      initial={income}
      submitLabel="Değişiklikleri kaydet"
      onSubmit={(values) => {
        updateIncome(income.id, values);
        router.back();
      }}
      onDelete={() =>
        Alert.alert('Gelir silinsin mi?', `"${income.title}" (${formatMoney(income.amount)}) silinecek.`, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => {
              router.back();
              deleteIncome(income.id);
            },
          },
        ])
      }
    />
  );
}
