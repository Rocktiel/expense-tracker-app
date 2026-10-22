import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { INCOME_CATEGORIES } from '@/lib/accounts';
import { amountToInput, parseAmount } from '@/lib/format';
import type { IncomeCategory } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

import { DateField } from './DateField';
import { AmountInput, Button, Chip, FieldLabel, InfoBanner, Input, Screen } from './ui';

export interface IncomeFormValues {
  title: string;
  amount: number;
  date: number;
  accountId: string;
  category: IncomeCategory;
  note?: string;
}

interface Props {
  title: string;
  initial?: Partial<IncomeFormValues>;
  submitLabel: string;
  onSubmit: (values: IncomeFormValues) => void;
  onDelete?: () => void;
}

export function IncomeForm({ title: screenTitle, initial, submitLabel, onSubmit, onDelete }: Props) {
  const accounts = useAppStore((s) => s.accounts);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);

  const [amount, setAmount] = useState(initial?.amount ? amountToInput(initial.amount) : '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState(() => initial?.date ?? Date.now());
  const [category, setCategory] = useState<IncomeCategory>(initial?.category ?? 'maas');
  const [accountId, setAccountId] = useState<string | undefined>(
    initial?.accountId ?? defaultAccountId ?? accounts[0]?.id,
  );
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Tutar eksik', 'Lütfen gelen tutarı girin. Örnek: 45000');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Açıklama eksik', 'Lütfen gelirin ne olduğunu yazın. Örnek: Ekim maaşı, Kira geliri');
      return;
    }
    if (!accountId) {
      Alert.alert('Hesap seçin', 'Gelirin hangi hesaba gireceğini seçin.');
      return;
    }
    onSubmit({
      title: title.trim(),
      amount: Math.round(value * 100) / 100,
      date,
      accountId,
      category,
      note: note.trim() || undefined,
    });
  };

  return (
    <Screen
      title={screenTitle}
      keyboard
      footer={
        <View>
          <Button title={submitLabel} icon="checkmark-circle" onPress={submit} />
          {onDelete ? (
            <View className="mt-3">
              <Button title="Sil" icon="trash" variant="danger" onPress={onDelete} />
            </View>
          ) : null}
        </View>
      }
    >
      <AmountInput value={amount} onChangeText={setAmount} autoFocus={!initial?.amount} />

      <Input
        label="Gelir nedir?"
        value={title}
        onChangeText={setTitle}
        placeholder="Örn: Ekim maaşı, Ek iş ödemesi"
        autoCapitalize="sentences"
      />

      <FieldLabel>Gelir türü</FieldLabel>
      <View className="mb-5 flex-row flex-wrap">
        {INCOME_CATEGORIES.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            color={c.color}
            selected={category === c.id}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </View>

      <DateField value={date} onChange={setDate} />

      <FieldLabel>Hangi hesaba giriyor?</FieldLabel>
      {accounts.length ? (
        <View className="mb-5 flex-row flex-wrap">
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.name}
              icon="wallet-outline"
              selected={accountId === a.id}
              onPress={() => setAccountId(a.id)}
            />
          ))}
        </View>
      ) : (
        <InfoBanner icon="wallet-outline" onPress={() => router.push('/account/new')}>
          Henüz hesap yok. Gelir eklemek için önce bir hesap oluşturun.
        </InfoBanner>
      )}

      <Input
        label="Not (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        placeholder="Örn: Ekim bordrosu"
        multiline
        style={{ minHeight: 80, textAlignVertical: 'top', paddingTop: 14 }}
      />
    </Screen>
  );
}
