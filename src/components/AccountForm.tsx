import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import type { IconName } from '@/lib/categories';
import { ACCOUNT_KINDS, accountKindInfo } from '@/lib/accounts';
import { amountToInput, parseAmount } from '@/lib/format';
import type { AccountKind } from '@/lib/types';

import { Button, Chip, FieldLabel, Input, Screen } from './ui';

export interface AccountFormValues {
  name: string;
  kind: AccountKind;
  openingBalance: number;
  note?: string;
}

interface Props {
  title: string;
  initial?: Partial<AccountFormValues>;
  submitLabel: string;
  onSubmit: (values: AccountFormValues) => void;
  onDelete?: () => void;
}

function HintLine({ icon, color, text }: { icon: IconName; color: string; text: string }) {
  return (
    <View className="mb-3 flex-row items-start last:mb-0">
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 3 }} />
      <Text className="ml-2 flex-1 text-base leading-6 text-muted">{text}</Text>
    </View>
  );
}

export function AccountForm({ title, initial, submitLabel, onSubmit, onDelete }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(initial?.kind ?? 'banka');
  const [openingBalance, setOpeningBalance] = useState(
    initial?.openingBalance ? amountToInput(initial.openingBalance) : '',
  );
  const [note, setNote] = useState(initial?.note ?? '');

  const kindInfo = accountKindInfo(kind);

  const submit = () => {
    if (!name.trim()) {
      Alert.alert('İsim eksik', 'Hesaba bir isim verin. Örnek: Garanti, Ziraat, Nakit');
      return;
    }
    const value = openingBalance.trim() ? parseAmount(openingBalance) : 0;
    if (!Number.isFinite(value)) {
      Alert.alert('Geçersiz tutar', 'Bakiye için bir sayı girin. Örnek: 12500,50');
      return;
    }
    onSubmit({
      name: name.trim(),
      kind,
      openingBalance: Math.round(value * 100) / 100,
      note: note.trim() || undefined,
    });
  };

  return (
    <Screen title={title} keyboard footer={<Button title={submitLabel} icon="checkmark-circle" onPress={submit} />}>
      <Input
        label="Hesap adı"
        value={name}
        onChangeText={setName}
        placeholder={kindInfo.placeholder}
        autoCapitalize="words"
        autoFocus={!initial?.name}
      />

      <FieldLabel>Hesap türü</FieldLabel>
      <View className="mb-5 flex-row flex-wrap">
        {ACCOUNT_KINDS.map((k) => (
          <Chip
            key={k.id}
            label={k.label}
            icon={k.icon}
            color={k.color}
            selected={kind === k.id}
            onPress={() => setKind(k.id)}
          />
        ))}
      </View>

      <Input
        label="Şu anki bakiye"
        value={openingBalance}
        onChangeText={(t) => setOpeningBalance(t.replace(/[^\d.,]/g, ''))}
        placeholder="Örn: 12500,50"
        keyboardType="decimal-pad"
      />
      <Input label="Not (isteğe bağlı)" value={note} onChangeText={setNote} placeholder="Örn: Maaş hesabı" />

      <View className="rounded-2xl border border-line bg-surface p-4">
        <Text className="mb-3 text-base font-bold text-ink">Nasıl çalışır?</Text>
        <HintLine
          icon="cash-outline"
          color="#60A5FA"
          text="Hesabın bugünkü bakiyesini yazın; uygulama buradan devam eder."
        />
        <HintLine
          icon="receipt-outline"
          color="#F3F6FA"
          text="Gideri bu hesapla kaydedince tutar bakiyeden düşer."
        />
        <HintLine
          icon="arrow-down-circle-outline"
          color="#34D399"
          text="Maaş, ek gelir gibi girişleri bu hesaba ekleyince bakiye artar."
        />
      </View>

      {onDelete ? (
        <View className="mt-6">
          <Button title="Hesabı sil" icon="trash" variant="danger" onPress={onDelete} />
        </View>
      ) : null}
    </Screen>
  );
}
