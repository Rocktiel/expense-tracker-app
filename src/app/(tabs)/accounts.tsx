import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, EmptyState, PageTitle, Screen, SectionTitle } from '@/components/ui';
import { accountKindInfo, accountSummaries, totalBalance } from '@/lib/accounts';
import { formatMoney, monthKey } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

export default function Accounts() {
  const accounts = useAppStore((s) => s.accounts);
  const expenses = useAppStore((s) => s.expenses);
  const incomes = useAppStore((s) => s.incomes);
  const transfers = useAppStore((s) => s.transfers);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);
  const balanceHidden = useAppStore((s) => s.balanceHidden);
  const toggleBalanceHidden = useAppStore((s) => s.toggleBalanceHidden);

  const now = useNow();
  const month = monthKey(now);
  const summaries = useMemo(
    () => accountSummaries(accounts, expenses, incomes, transfers, month),
    [accounts, expenses, incomes, transfers, month],
  );
  const total = useMemo(() => totalBalance(accounts, expenses, incomes, transfers), [accounts, expenses, incomes, transfers]);
  const monthIn = summaries.reduce((s, a) => s + a.monthIn, 0);
  const monthOut = summaries.reduce((s, a) => s + a.monthOut, 0);

  return (
    <Screen safeTop>
      <PageTitle title="Hesaplar" subtitle="Banka, nakit ve kart bakiyeleriniz" />

      {accounts.length ? (
        <>
          <Card className="mb-4 p-5">
            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-muted">Toplam bakiye</Text>
              <Pressable
                onPress={toggleBalanceHidden}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={balanceHidden ? 'Bakiyeyi göster' : 'Bakiyeyi gizle'}
                className="ml-2 h-7 w-7 items-center justify-center rounded-full active:opacity-60"
              >
                <Ionicons
                  name={balanceHidden ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </Pressable>
            </View>
            <Text
              className={`mt-1 text-4xl font-bold ${!balanceHidden && total < 0 ? 'text-danger' : 'text-ink'}`}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {balanceHidden ? '••••••' : formatMoney(total)}
            </Text>
            <Text className="mt-2 text-base text-muted">
              {balanceHidden ? (
                'Bu ay ••••••'
              ) : (
                <>
                  Bu ay{' '}
                  <Text className="font-semibold text-primary">+{formatMoney(monthIn, { decimals: false })}</Text>
                  {' · '}
                  <Text className="font-semibold text-ink">-{formatMoney(monthOut, { decimals: false })}</Text>
                </>
              )}
            </Text>
          </Card>

          <View className="flex-row gap-3">
            <Button
              title="Gelir Ekle"
              icon="arrow-down-circle"
              onPress={() =>
                router.push({
                  pathname: '/income/new',
                  params: { accountId: defaultAccountId ?? accounts[0].id },
                })
              }
              className="flex-1"
            />
            <Button
              title="Hesap Ekle"
              icon="add-circle"
              variant="secondary"
              onPress={() => router.push('/account/new')}
              className="flex-1"
            />
          </View>

          <SectionTitle title="Hesaplarım" action="Hesap ekle" onAction={() => router.push('/account/new')} />
          <View className="gap-2">
            {summaries.map(({ account, balance, monthIn: mi, monthOut: mo }) => {
              const info = accountKindInfo(account.kind);
              return (
                <Pressable
                  key={account.id}
                  onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${account.name}, bakiye ${formatMoney(balance)}`}
                  className="min-h-[76px] flex-row items-center rounded-2xl border border-line bg-surface p-3 active:opacity-70"
                >
                  <View
                    style={{ backgroundColor: `${info.color}26`, width: 48, height: 48 }}
                    className="items-center justify-center rounded-2xl"
                  >
                    <Ionicons name={info.icon} size={24} color={info.color} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
                      {account.name}
                    </Text>
                    <Text className="text-sm text-muted" numberOfLines={1}>
                      {info.label}
                      {account.note ? ` · ${account.note}` : ''}
                    </Text>
                    {!balanceHidden && (mi || mo) ? (
                      <Text className="mt-0.5 text-sm text-faint" numberOfLines={1}>
                        Bu ay {mi ? `+${formatMoney(mi, { decimals: false })}` : ''}
                        {mi && mo ? ' · ' : ''}
                        {mo ? `-${formatMoney(mo, { decimals: false })}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <View className="ml-2 items-end">
                    <Text
                      className={`text-lg font-bold ${!balanceHidden && balance < 0 ? 'text-danger' : 'text-ink'}`}
                      numberOfLines={1}
                    >
                      {balanceHidden ? '••••' : formatMoney(balance)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.faint} style={{ marginLeft: 4 }} />
                </Pressable>
              );
            })}
          </View>

          <View className="mt-4">
            <Button
              title="Hesaplar arası transfer"
              icon="swap-horizontal"
              variant="secondary"
              onPress={() => router.push('/transfer/new')}
            />
          </View>
        </>
      ) : (
        <EmptyState
          icon="wallet-outline"
          title="Henüz hesap yok"
          message="Garanti, Ziraat, nakit gibi hesaplarınızı ekleyin. Harcama kaydederken hangi hesaptan ödediğinizi seçin, bakiye kendiliğinden düşsün."
        >
          <Button title="Hesap ekle" icon="add-circle" onPress={() => router.push('/account/new')} />
        </EmptyState>
      )}
    </Screen>
  );
}
