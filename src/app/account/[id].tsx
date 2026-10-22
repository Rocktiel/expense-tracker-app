import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ExpenseRow';
import { Button, Card, EmptyState, FieldLabel, Input, Row, Screen, SectionTitle } from '@/components/ui';
import {
  accountKindInfo,
  accountName,
  accountSummaries,
  accountMovements,
  incomeCategoryInfo,
  type Movement,
} from '@/lib/accounts';
import { getCategory } from '@/lib/categories';
import { amountToInput, formatMoney, formatRelativeDay, monthKey, parseAmount } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import type { Account } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const accounts = useAppStore((s) => s.accounts);
  const expenses = useAppStore((s) => s.expenses);
  const incomes = useAppStore((s) => s.incomes);
  const transfers = useAppStore((s) => s.transfers);
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const adjustAccountBalance = useAppStore((s) => s.adjustAccountBalance);
  const deleteIncome = useAppStore((s) => s.deleteIncome);
  const deleteTransfer = useAppStore((s) => s.deleteTransfer);

  const account = accounts.find((a) => a.id === id);

  const [correcting, setCorrecting] = useState(false);
  const [target, setTarget] = useState('');

  const now = useNow();
  const month = monthKey(now);
  const summary = useMemo(
    () => (account ? accountSummaries([account], expenses, incomes, transfers, month)[0] : undefined),
    [account, expenses, incomes, transfers, month],
  );
  const movements = useMemo(
    () => (account ? accountMovements(account.id, expenses, incomes, transfers) : []),
    [account, expenses, incomes, transfers],
  );

  if (!account || !summary) {
    return (
      <Screen title="Hesap">
        <EmptyState icon="wallet-outline" title="Hesap bulunamadı" message="Bu hesap silinmiş olabilir.">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  const info = accountKindInfo(account.kind);

  const startCorrect = () => {
    setTarget(amountToInput(summary.balance));
    setCorrecting(true);
  };

  const saveCorrect = () => {
    const value = parseAmount(target);
    if (!Number.isFinite(value)) {
      Alert.alert('Geçersiz tutar', 'Bakiyeyi rakamla yazın. Örnek: 12500,50');
      return;
    }
    adjustAccountBalance(account.id, Math.round(value * 100) / 100);
    setCorrecting(false);
  };

  const confirmDelete = () => {
    const linkedExpenses = expenses.filter((e) => e.accountId === account.id).length;
    const linkedIncomes = incomes.filter((i) => i.accountId === account.id).length;
    const linkedTransfers = transfers.filter(
      (t) => t.fromAccountId === account.id || t.toAccountId === account.id,
    ).length;
    const parts = [
      linkedExpenses ? `${linkedExpenses} gider hesapsız kalacak` : '',
      linkedIncomes ? `${linkedIncomes} gelir kaydı silinecek` : '',
      linkedTransfers ? `${linkedTransfers} transfer kaydı silinecek` : '',
    ].filter(Boolean);

    Alert.alert(
      'Hesap silinsin mi?',
      parts.length ? `"${account.name}" silinecek. ${parts.join(', ')}.` : `"${account.name}" silinecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            router.back();
            deleteAccount(account.id);
          },
        },
      ],
    );
  };

  const removeMovement = (m: Movement) => {
    if (m.kind === 'income') {
      Alert.alert('Gelir silinsin mi?', `"${m.income.title}" (${formatMoney(m.amount)}) silinecek.`, [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteIncome(m.income.id) },
      ]);
    } else if (m.kind === 'transfer') {
      Alert.alert(
        'Transfer silinsin mi?',
        `${formatMoney(m.amount)} tutarındaki transfer silinecek. İki hesabın bakiyesi de düzelecek.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Sil', style: 'destructive', onPress: () => deleteTransfer(m.transfer.id) },
        ],
      );
    }
  };

  return (
    <Screen title={account.name}>
      <Card className="mb-4 p-5">
        <View className="flex-row items-center">
          <View
            style={{ backgroundColor: `${info.color}26`, width: 44, height: 44 }}
            className="items-center justify-center rounded-2xl"
          >
            <Ionicons name={info.icon} size={24} color={info.color} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base text-muted">{info.label}</Text>
            {account.note ? (
              <Text className="text-sm text-faint" numberOfLines={1}>
                {account.note}
              </Text>
            ) : null}
          </View>
        </View>

        <Text className="mt-4 text-base font-semibold text-muted">Güncel bakiye</Text>
        <Text
          className={`mt-1 text-4xl font-bold ${summary.balance < 0 ? 'text-danger' : 'text-ink'}`}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {formatMoney(summary.balance)}
        </Text>
        <Text className="mt-2 text-base text-muted">
          Bu ay{' '}
          <Text className="font-semibold text-primary">+{formatMoney(summary.monthIn, { decimals: false })}</Text>
          {' · '}
          <Text className="font-semibold text-ink">-{formatMoney(summary.monthOut, { decimals: false })}</Text>
        </Text>
      </Card>

      <View className="flex-row gap-3">
        <Button
          title="Gelir Ekle"
          icon="arrow-down-circle"
          onPress={() => router.push({ pathname: '/income/new', params: { accountId: account.id } })}
          className="flex-1"
        />
        <Button
          title="Transfer"
          icon="swap-horizontal"
          variant="secondary"
          onPress={() => router.push({ pathname: '/transfer/new', params: { fromAccountId: account.id } })}
          className="flex-1"
        />
      </View>

      <View className="mt-3">
        {correcting ? (
          <Card>
            <FieldLabel>Gerçek bakiye ne kadar?</FieldLabel>
            <Input
              label=""
              value={target}
              onChangeText={(t) => setTarget(t.replace(/[^\d.,-]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0,00"
              autoFocus
              className="-mt-2 mb-3"
            />
            <Text className="mb-3 text-sm leading-5 text-muted">
              Fark, başlangıç bakiyesine eklenir. Harcamalarınız değişmez.
            </Text>
            <View className="flex-row gap-3">
              <Button title="Vazgeç" variant="secondary" small onPress={() => setCorrecting(false)} className="flex-1" />
              <Button title="Bakiyeyi güncelle" small onPress={saveCorrect} className="flex-[2]" />
            </View>
          </Card>
        ) : (
          <Button title="Bakiyeyi düzelt" icon="options" variant="secondary" onPress={startCorrect} />
        )}
      </View>

      <SectionTitle title="Hareketler" />
      {movements.length ? (
        <View className="gap-2">
          {movements.map((m) => (
            <MovementRow
              key={`${m.kind}-${m.id}`}
              movement={m}
              accounts={accounts}
              onPress={() => {
                if (m.kind === 'expense') {
                  router.push({ pathname: '/expense/[id]', params: { id: m.expense.id } });
                } else if (m.kind === 'income') {
                  router.push({ pathname: '/income/edit/[id]', params: { id: m.income.id } });
                } else {
                  removeMovement(m);
                }
              }}
            />
          ))}
        </View>
      ) : (
        <Text className="text-base text-muted">
          Bu hesapta henüz hareket yok. Gider eklerken bu hesabı seçerseniz burada görünür.
        </Text>
      )}

      <SectionTitle title="Hesap Ayarları" />
      <Card className="py-1">
        <Row
          icon="create"
          title="Hesabı düzenle"
          onPress={() => router.push({ pathname: '/account/edit/[id]', params: { id: account.id } })}
        />
        <Row icon="trash" title="Hesabı sil" danger onPress={confirmDelete} />
      </Card>
    </Screen>
  );
}

function MovementRow({
  movement,
  accounts,
  onPress,
}: {
  movement: Movement;
  accounts: Account[];
  onPress: () => void;
}) {
  if (movement.kind === 'expense') {
    const category = getCategory(movement.expense.category);
    return (
      <Pressable
        onPress={onPress}
        className="min-h-[68px] flex-row items-center rounded-2xl bg-surface px-3 py-3 active:opacity-70"
      >
        <CategoryIcon category={movement.expense.category} size={42} />
        <View className="ml-3 flex-1">
          <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
            {movement.expense.title}
          </Text>
          <Text className="text-sm text-muted">
            {formatRelativeDay(movement.date)} · {category.label}
          </Text>
        </View>
        <Text className="ml-2 text-lg font-bold text-ink">-{formatMoney(movement.amount)}</Text>
      </Pressable>
    );
  }

  if (movement.kind === 'income') {
    const category = incomeCategoryInfo(movement.income.category);
    return (
      <Pressable
        onPress={onPress}
        className="min-h-[68px] flex-row items-center rounded-2xl bg-surface px-3 py-3 active:opacity-70"
      >
        <View
          style={{ backgroundColor: `${category.color}26` }}
          className="h-11 w-11 items-center justify-center rounded-2xl"
        >
          <Ionicons name={category.icon} size={22} color={category.color} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
            {movement.income.title}
          </Text>
          <Text className="text-sm text-muted">
            {formatRelativeDay(movement.date)} · {category.label}
          </Text>
        </View>
        <Text className="ml-2 text-lg font-bold text-primary">+{formatMoney(movement.amount)}</Text>
      </Pressable>
    );
  }

  const other = accountName(accounts, movement.direction === 'in' ? movement.transfer.fromAccountId : movement.transfer.toAccountId);
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[68px] flex-row items-center rounded-2xl bg-surface px-3 py-3 active:opacity-70"
    >
      <View className="h-11 w-11 items-center justify-center rounded-2xl bg-info/20">
        <Ionicons name="swap-horizontal" size={22} color={COLORS.info} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {movement.direction === 'in' ? `${other} → bu hesap` : `Bu hesap → ${other}`}
        </Text>
        <Text className="text-sm text-muted">Transfer · {formatRelativeDay(movement.date)}</Text>
      </View>
      <Text className={`ml-2 text-lg font-bold ${movement.direction === 'in' ? 'text-primary' : 'text-ink'}`}>
        {movement.direction === 'in' ? '+' : '-'}
        {formatMoney(movement.amount)}
      </Text>
    </Pressable>
  );
}
