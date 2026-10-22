import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { ExpenseRow, CategoryIcon } from '@/components/ExpenseRow';
import { BigAction, Card, EmptyState, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { accountKindInfo, accountName, accountSummaries, totalBalance } from '@/lib/accounts';
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
  const accounts = useAppStore((s) => s.accounts);
  const incomes = useAppStore((s) => s.incomes);
  const transfers = useAppStore((s) => s.transfers);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);

  const now = useNow();
  const current = monthKey(now);
  const summary = useMemo(() => {
    const thisMonth = sumAmounts(expensesInMonth(expenses, current));
    const lastMonth = sumAmounts(expensesInMonth(expenses, shiftMonth(current, -1)));
    const today = new Date(now).toDateString();
    const todayTotal = sumAmounts(expenses.filter((e) => new Date(e.date).toDateString() === today));
    return { thisMonth, lastMonth, todayTotal };
  }, [expenses, current, now]);

  const balances = useMemo(
    () => accountSummaries(accounts, expenses, incomes, transfers, current),
    [accounts, expenses, incomes, transfers, current],
  );
  const total = useMemo(() => totalBalance(accounts, expenses, incomes, transfers), [accounts, expenses, incomes, transfers]);

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

      {accounts.length ? (
        <Pressable
          onPress={() => router.push('/accounts')}
          accessibilityRole="button"
          accessibilityLabel={`Toplam bakiye ${formatMoney(total)}`}
          className="mb-4 rounded-3xl border border-primary/40 bg-primary/10 p-5 active:opacity-80"
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-muted">Toplam bakiye</Text>
              <Text
                className={`mt-1 text-4xl font-bold ${total < 0 ? 'text-danger' : 'text-ink'}`}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {formatMoney(total)}
              </Text>
            </View>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/income/new',
                  params: { accountId: defaultAccountId ?? accounts[0].id },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Gelir ekle"
              className="ml-2 min-h-[40px] flex-row items-center rounded-full bg-primary px-3 active:opacity-70"
            >
              <Ionicons name="add" size={18} color={COLORS.onprimary} />
              <Text className="ml-0.5 text-sm font-bold text-onprimary">Gelir</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1 mt-3">
            {balances.map(({ account, balance }) => {
              const info = accountKindInfo(account.kind);
              return (
                <View key={account.id} className="mx-1 flex-row items-center rounded-full bg-surface/80 px-3 py-1.5">
                  <Ionicons name={info.icon} size={14} color={info.color} />
                  <Text className="ml-1.5 text-sm text-muted" numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text className={`ml-1.5 text-sm font-bold ${balance < 0 ? 'text-danger' : 'text-ink'}`}>
                    {formatMoney(balance, { decimals: false })}
                  </Text>
                </View>
              );
            })}
            <View className="mx-1 flex-row items-center rounded-full border border-dashed border-line px-3 py-1.5">
              <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
              <Text className="ml-1 text-sm font-semibold text-muted">Hesaplar</Text>
            </View>
          </ScrollView>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.push('/account/new')}
          className="mb-4 flex-row items-center rounded-3xl border border-dashed border-line p-4 active:opacity-70"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <Ionicons name="wallet-outline" size={22} color={COLORS.primary} />
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-base font-bold text-ink">Bakiyenizi takip edin</Text>
            <Text className="mt-0.5 text-sm leading-5 text-muted">
              Garanti, Ziraat, nakit... Hesap ekleyin; giderler bakiyeden düşsün, maaş gelince ekleyin.
            </Text>
          </View>
          <Ionicons name="add-circle" size={26} color={COLORS.primary} />
        </Pressable>
      )}

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
                    Alert.alert(
                      'Ödendi mi?',
                      `${item.title} (${formatMoney(item.amount)}) bu ayın giderlerine eklenecek.${
                        accountName(accounts, item.accountId)
                          ? ` ${accountName(accounts, item.accountId)} hesabından düşülecek.`
                          : ''
                      }`,
                      [
                        { text: 'Vazgeç', style: 'cancel' },
                        { text: 'Evet, ödendi', onPress: () => markPaid(item.id) },
                      ],
                    )
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
