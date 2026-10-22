import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';

import type { CategoryId } from '@/lib/categories';
import { accountBalance } from '@/lib/accounts';
import { amountToInput, formatMoney, monthKey, normalizeSearch, parseAmount, PAYMENT_METHODS } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import type { PaymentMethod } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

import { CategoryGrid } from './CategoryGrid';
import { DateField } from './DateField';
import { RepeatMonthsPicker } from './RepeatMonthsPicker';
import { AmountInput, Button, Chip, FieldLabel, Input, Screen } from './ui';

export interface ExpenseFormValues {
  title: string;
  amount: number;
  date: number;
  category: CategoryId;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  note?: string;
}

interface Props {
  title: string;
  initial?: Partial<ExpenseFormValues>;
  submitLabel: string;
  allowRepeat?: boolean;
  /** repeat: null ise tekrarlanmaz; totalMonths null ise süresiz tekrarlanır */
  onSubmit: (values: ExpenseFormValues, options: { repeat: { totalMonths: number | null } | null }) => void;
}

export function ExpenseForm({ title: screenTitle, initial, submitLabel, allowRepeat = false, onSubmit }: Props) {
  const expenses = useAppStore((s) => s.expenses);
  const accounts = useAppStore((s) => s.accounts);
  const incomes = useAppStore((s) => s.incomes);
  const transfers = useAppStore((s) => s.transfers);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);

  const [amount, setAmount] = useState(initial?.amount ? amountToInput(initial.amount) : '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<CategoryId>(initial?.category ?? 'market');
  const [date, setDate] = useState(() => initial?.date ?? Date.now());
  const [payment, setPayment] = useState<PaymentMethod | undefined>(initial?.paymentMethod);
  // Yeni kayıtta son kullanılan hesap ön seçili gelir; düzenlemede kaydın hesabı korunur
  const [accountId, setAccountId] = useState<string | undefined>(
    initial ? initial.accountId : defaultAccountId,
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [repeat, setRepeat] = useState(false);
  const [repeatMonths, setRepeatMonths] = useState<number | null>(null);
  const [showNote, setShowNote] = useState(Boolean(initial?.note));

  const accountBalances = useMemo(
    () => new Map(accounts.map((a) => [a.id, accountBalance(a, expenses, incomes, transfers)])),
    [accounts, expenses, incomes, transfers],
  );

  /** Daha önce girilen başlıklardan öneriler; seçilince kategorisi de gelir */
  const suggestions = useMemo(() => {
    const q = normalizeSearch(title);
    const seen = new Set<string>();
    const result: { title: string; category: CategoryId }[] = [];
    for (const e of expenses) {
      const key = normalizeSearch(e.title);
      if (seen.has(key)) continue;
      seen.add(key);
      if (q && (!key.includes(q) || key === q)) continue;
      result.push({ title: e.title, category: e.category });
      if (result.length >= 6) break;
    }
    return result;
  }, [expenses, title]);

  const submit = () => {
    const value = parseAmount(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Tutar eksik', 'Lütfen harcama tutarını girin. Örnek: 125,50');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Açıklama eksik', 'Lütfen nereye veya ne için harcadığınızı yazın. Örnek: Migros, Elektrik faturası');
      return;
    }
    onSubmit(
      {
        title: title.trim(),
        amount: Math.round(value * 100) / 100,
        date,
        category,
        paymentMethod: payment,
        accountId,
        note: note.trim() || undefined,
      },
      { repeat: allowRepeat && repeat ? { totalMonths: repeatMonths } : null },
    );
  };

  return (
    <Screen title={screenTitle} keyboard footer={<Button title={submitLabel} icon="checkmark-circle" onPress={submit} />}>
      <AmountInput value={amount} onChangeText={setAmount} autoFocus={!initial?.amount} />

      <Input
        label="Nereye / ne için?"
        value={title}
        onChangeText={setTitle}
        placeholder="Örn: Migros, Telefon faturası"
        autoCapitalize="sentences"
        returnKeyType="done"
        className={suggestions.length ? 'mb-2' : 'mb-5'}
      />
      {suggestions.length ? (
        <View className="mb-4 flex-row flex-wrap">
          {suggestions.map((s) => (
            <Chip
              key={s.title}
              label={s.title}
              selected={false}
              icon="time-outline"
              onPress={() => {
                setTitle(s.title);
                setCategory(s.category);
              }}
            />
          ))}
        </View>
      ) : null}

      <FieldLabel>Kategori</FieldLabel>
      <CategoryGrid value={category} onChange={setCategory} />

      <DateField value={date} onChange={setDate} />

      <FieldLabel>Ödeme şekli (isteğe bağlı)</FieldLabel>
      <View className="mb-4 flex-row flex-wrap">
        {PAYMENT_METHODS.map((m) => (
          <Chip
            key={m.id}
            label={m.label}
            selected={payment === m.id}
            onPress={() => setPayment(payment === m.id ? undefined : m.id)}
          />
        ))}
      </View>

      <FieldLabel>Hangi hesaptan ödendi? (isteğe bağlı)</FieldLabel>
      {accounts.length ? (
        <View className="mb-4 flex-row flex-wrap">
          <Chip label="Hesapsız" selected={!accountId} onPress={() => setAccountId(undefined)} />
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={`${a.name} · ${formatMoney(accountBalances.get(a.id) ?? 0, { decimals: false })}`}
              icon="wallet-outline"
              selected={accountId === a.id}
              onPress={() => setAccountId(accountId === a.id ? undefined : a.id)}
            />
          ))}
        </View>
      ) : (
        <Text className="mb-5 text-sm leading-5 text-muted">
          Hesap eklediğinizde harcamanın hangi banka/nakit hesabından düştüğünü seçebilir ve bakiyenizi ana sayfada
          görebilirsiniz.
        </Text>
      )}

      {showNote ? (
        <Input
          label="Not"
          value={note}
          onChangeText={setNote}
          placeholder="Örn: 3. taksit, Eylül dönemi"
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: 14 }}
        />
      ) : (
        <Pressable onPress={() => setShowNote(true)} className="mb-5 flex-row items-center py-2 active:opacity-60">
          <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
          <Text className="ml-2 text-base font-semibold text-primary">Not ekle</Text>
        </Pressable>
      )}

      {allowRepeat ? (
        <View className={`mb-2 rounded-2xl border bg-surface ${repeat ? 'border-primary' : 'border-line'}`}>
          <Pressable
            onPress={() => setRepeat(!repeat)}
            accessibilityRole="switch"
            accessibilityState={{ checked: repeat }}
            className="flex-row items-center p-4 active:opacity-80"
          >
            <Ionicons name="repeat" size={24} color={COLORS.primary} />
            <View className="ml-3 flex-1">
              <Text className="text-lg font-semibold text-ink">Her ay tekrarla</Text>
              <Text className="text-sm text-muted">Kredi, kira, fatura gibi düzenli ödemeler için hatırlatıcı oluşturur</Text>
            </View>
            <Switch
              value={repeat}
              onValueChange={setRepeat}
              trackColor={{ true: COLORS.primary, false: COLORS.line }}
              thumbColor={COLORS.ink}
            />
          </Pressable>
          {repeat ? (
            <View className="border-t border-line px-4 pb-4 pt-4">
              <RepeatMonthsPicker
                value={repeatMonths}
                onChange={setRepeatMonths}
                startMonth={monthKey(date)}
                amount={parseAmount(amount)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}
