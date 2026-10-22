import { router, useLocalSearchParams } from 'expo-router';

import { IncomeForm } from '@/components/IncomeForm';
import { useAppStore } from '@/store/useAppStore';

export default function NewIncome() {
  const { accountId } = useLocalSearchParams<{ accountId?: string }>();
  const addIncome = useAppStore((s) => s.addIncome);

  return (
    <IncomeForm
      title="Gelir Ekle"
      submitLabel="Geliri kaydet"
      initial={accountId ? { accountId } : undefined}
      onSubmit={(values) => {
        addIncome(values);
        router.back();
      }}
    />
  );
}
