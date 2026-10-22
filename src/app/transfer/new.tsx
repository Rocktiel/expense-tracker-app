import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { AmountInput, Button, Chip, EmptyState, FieldLabel, InfoBanner, Input, Screen } from '@/components/ui';
import { accountKindInfo } from '@/lib/accounts';
import { formatMoney, parseAmount } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';

export default function NewTransfer() {
  const { fromAccountId } = useLocalSearchParams<{ fromAccountId?: string }>();
  const accounts = useAppStore((s) => s.accounts);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);
  const addTransfer = useAppStore((s) => s.addTransfer);

  const first = accounts.find((a) => a.id === (fromAccountId ?? defaultAccountId)) ?? accounts[0];
  const [from, setFrom] = useState<string | undefined>(first?.id);
  const [to, setTo] = useState<string | undefined>(accounts.find((a) => a.id !== first?.id)?.id);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => Date.now());
  const [note, setNote] = useState('');

  if (accounts.length < 2) {
    return (
      <Screen title="Transfer">
        <EmptyState
          icon="swap-horizontal"
          title="En az iki hesap gerekli"
          message="Hesaplar arasında para aktarmak için önce iki hesap oluşturun. Örneğin Garanti ve Nakit."
        >
          <Button title="Hesap ekle" icon="add-circle" onPress={() => router.push('/account/new')} />
        </EmptyState>
      </Screen>
    );
  }

  const submit = () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Tutar eksik', 'Lütfen aktarılacak tutarı girin.');
      return;
    }
    if (!from || !to) {
      Alert.alert('Hesap seçin', 'Para hangi hesaptan hangi hesaba gidecek?');
      return;
    }
    if (from === to) {
      Alert.alert('Aynı hesap', 'Kaynak ve hedef hesap farklı olmalı.');
      return;
    }
    addTransfer({
      amount: Math.round(value * 100) / 100,
      date,
      fromAccountId: from,
      toAccountId: to,
      note: note.trim() || undefined,
    });
    router.back();
  };

  const fromAccount = accounts.find((a) => a.id === from);
  const toAccount = accounts.find((a) => a.id === to);

  return (
    <Screen title="Transfer" keyboard footer={<Button title="Transferi kaydet" icon="swap-horizontal" onPress={submit} />}>
      <AmountInput value={amount} onChangeText={setAmount} autoFocus />

      <FieldLabel>Nereden?</FieldLabel>
      <View className="mb-5 flex-row flex-wrap">
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            icon={accountKindInfo(a.kind).icon}
            color={accountKindInfo(a.kind).color}
            selected={from === a.id}
            onPress={() => {
              setFrom(a.id);
              if (to === a.id) setTo(accounts.find((x) => x.id !== a.id)?.id);
            }}
          />
        ))}
      </View>

      <FieldLabel>Nereye?</FieldLabel>
      <View className="mb-5 flex-row flex-wrap">
        {accounts.map((a) => (
          <Chip
            key={a.id}
            label={a.name}
            icon={accountKindInfo(a.kind).icon}
            color={accountKindInfo(a.kind).color}
            selected={to === a.id}
            onPress={() => {
              setTo(a.id);
              if (from === a.id) setFrom(accounts.find((x) => x.id !== a.id)?.id);
            }}
          />
        ))}
      </View>

      <DateField value={date} onChange={setDate} />

      <Input
        label="Not (isteğe bağlı)"
        value={note}
        onChangeText={setNote}
        placeholder="Örn: Maaştan nakit çektim"
      />

      {fromAccount && toAccount ? (
        <InfoBanner icon="information-circle">
          {`${formatMoney(parseAmount(amount) || 0, { decimals: false })} tutar ${fromAccount.name} hesabından düşüp ${toAccount.name} hesabına eklenecek. Toplam bakiye değişmez.`}
        </InfoBanner>
      ) : null}
    </Screen>
  );
}
