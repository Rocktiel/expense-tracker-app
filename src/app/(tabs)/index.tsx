import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { ExpenseRow, CategoryIcon } from '@/components/ExpenseRow';
import { BigAction, Card, EmptyState, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { formatDate, formatMoney, greeting, monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { expensesInMonth, sumAmounts, upcomingPayments } from '@/lib/stats';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const userName = useAppStore((s) => s.userName);
  const expenses = useAppStore((s) => s.expenses);
  const recurring = useAppStore((s) => s.recurring);
  const budget = useAppStore((s) => s.monthlyBudget);
  const markPaid = useAppStore((s) => s.markRecurringPaid);

  const now = useNow();
  const current = monthKey(now);
  const summary = useMemo(() => {
    const thisMonth = sumAmounts(expensesInMonth(expenses, current));
    const lastMonth = sumAmounts(expensesInMonth(expenses, shiftMonth(current, -1)));
    const today = new Date(now).toDateString();
    const todayTotal = sumAmounts(expenses.filter((e) => new Date(e.date).toDateString() === today));
    return { thisMonth, lastMonth, todayTotal };
  }, [expenses, current, now]);

  const upcoming = useMemo(
    () => upcomingPayments(recurring, new Date(now))
        .filter((u) => u.status === 'active' && !u.paid)
        .slice(0, 3),
    [recurring, now],
  );
  const recent = expenses.slice(0, 5);

  const budgetRatio = budget ? summary.thisMonth / budget : 0;
  const budgetColor = budgetRatio >= 1 ? COLORS.danger : budgetRatio >= 0.8 ? COLORS.warn : COLORS.primary;
  const diff = summary.thisMonth - summary.lastMonth;

  return (
    <Screen safeTop>
      <View className="mb-5">
        <Text className="text-base text-muted">{formatDate(now, { weekday: true })}</Text>
        <Text className="mt-1 text-3xl font-bold text-ink" numberOfLines={1}>
          {greeting()}, {userName} 👋
        </Text>
      </View>

      <Card className="mb-4 p-5">
        <Text className="text-base font-semibold text-muted">{monthLabel(current, false)} ayında harcanan</Text>
        <Text className="mt-1 text-4xl font-bold text-ink" adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(summary.thisMonth)}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center">
          <Text className="text-base text-muted">Bugün: </Text>
          <Text className="text-base font-semibold text-ink">{formatMoney(summary.todayTotal)}</Text>
          {summary.lastMonth > 0 ? (
            <Text className={`ml-3 text-base font-semibold ${diff > 0 ? 'text-danger' : 'text-primary'}`}>
              {diff > 0 ? '▲' : '▼'} geçen aya göre {formatMoney(Math.abs(diff), { decimals: false })}
            </Text>
          ) : null}
        </View>

        {budget ? (
          <View className="mt-4">
            <ProgressBar value={budgetRatio} color={budgetColor} />
            <Text className="mt-2 text-base text-muted">
              {budgetRatio >= 1
                ? `Bütçe ${formatMoney(summary.thisMonth - budget, { decimals: false })} aşıldı`
                : `Bütçeden kalan: ${formatMoney(budget - summary.thisMonth, { decimals: false })}`}
            </Text>
          </View>
        ) : null}
      </Card>

      <View className="flex-row gap-3">
        <BigAction
          accent
          icon="camera"
          title="Fiş Tara"
          subtitle="Fotoğraftan otomatik oku"
          onPress={() => router.push('/scan')}
        />
        <BigAction
          icon="create"
          title="Elle Ekle"
          subtitle="Fatura, kredi, nakit..."
          onPress={() => router.push('/expense/new')}
        />
      </View>

      {upcoming.length ? (
        <>
          <SectionTitle title="Yaklaşan Ödemeler" action="Tümü" onAction={() => router.push('/recurring')} />
          <View className="gap-2">
            {upcoming.map(({ item, daysLeft, installment }) => (
              <View key={item.id} className="flex-row items-center rounded-2xl bg-surface px-3 py-3">
                <CategoryIcon category={item.category} size={44} />
                <View className="ml-3 flex-1">
                  <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className={`text-sm ${daysLeft < 0 ? 'text-danger' : daysLeft <= 3 ? 'text-warn' : 'text-muted'}`}>
                    {formatMoney(item.amount)} ·{' '}
                    {installment ? `${installment.current}/${installment.total}. taksit · ` : ''}
                    {daysLeft < 0 ? `${-daysLeft} gün gecikti` : daysLeft === 0 ? 'Bugün' : `${daysLeft} gün kaldı`}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert('Ödendi mi?', `${item.title} (${formatMoney(item.amount)}) bu ayın giderlerine eklenecek.`, [
                      { text: 'Vazgeç', style: 'cancel' },
                      { text: 'Evet, ödendi', onPress: () => markPaid(item.id) },
                    ])
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title} ödendi`}
                  className="min-h-[44px] flex-row items-center rounded-xl bg-primary/15 px-3 active:opacity-70"
                >
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  <Text className="ml-1 text-base font-bold text-primary">Ödendi</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionTitle
        title="Son Harcamalar"
        action={recent.length ? 'Tümünü gör' : undefined}
        onAction={() => router.push('/expenses')}
      />
      {recent.length ? (
        <View className="gap-2">
          {recent.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              onPress={() => router.push({ pathname: '/expense/[id]', params: { id: e.id } })}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="Henüz harcama yok"
          message={'Yukarıdaki "Fiş Tara" butonuyla fişinizin fotoğrafını çekin ya da "Elle Ekle" ile harcama girin.'}
        />
      )}

      {!recurring.length && expenses.length > 0 ? (
        <Pressable
          onPress={() => router.push('/recurring')}
          className="mt-6 flex-row items-center rounded-2xl border border-dashed border-line p-4 active:opacity-70"
        >
          <Ionicons name="repeat" size={24} color={COLORS.primary} />
          <Text className="ml-3 flex-1 text-base text-muted">
            Kredi, kira, fatura gibi her ay ödediğiniz şeyleri ekleyin; zamanı gelince hatırlatalım.
          </Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
