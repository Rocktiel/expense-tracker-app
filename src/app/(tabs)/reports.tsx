import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ExpenseRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Card, EmptyState, PageTitle, ProgressBar, Screen, SectionTitle } from '@/components/ui';
import { getCategory } from '@/lib/categories';
import { daysInMonth, formatMoney, formatMoneyShort, MONTHS_SHORT, monthKey } from '@/lib/format';
import { expensesInMonth, monthlyTotals, sumAmounts, topMerchants, totalsByCategory } from '@/lib/stats';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

const CHART_HEIGHT = 150;

export default function Reports() {
  const expenses = useAppStore((s) => s.expenses);
  const budget = useAppStore((s) => s.monthlyBudget);
  const now = useNow();
  const [month, setMonth] = useState(() => monthKey(Date.now()));

  const data = useMemo(() => {
    const list = expensesInMonth(expenses, month);
    const total = sumAmounts(list);
    const isCurrent = month === monthKey(now);
    const days = isCurrent ? new Date(now).getDate() : daysInMonth(month);
    return {
      list,
      total,
      dailyAvg: days ? total / days : 0,
      categories: totalsByCategory(list),
      months: monthlyTotals(expenses, month, 6),
      merchants: topMerchants(list, 5),
      biggest: list.reduce<(typeof list)[number] | null>((max, e) => (!max || e.amount > max.amount ? e : max), null),
    };
  }, [expenses, month, now]);

  const maxMonth = Math.max(...data.months.map((m) => m.total), 1);

  return (
    <Screen safeTop>
      <PageTitle title="Raporlar" />
      <MonthSwitcher value={month} onChange={setMonth} />

      <View className="flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-sm font-semibold text-muted">Toplam</Text>
          <Text className="mt-1 text-2xl font-bold text-ink" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(data.total, { decimals: false })}
          </Text>
          <Text className="mt-1 text-sm text-muted">{data.list.length} harcama</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-sm font-semibold text-muted">Günlük ortalama</Text>
          <Text className="mt-1 text-2xl font-bold text-ink" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(data.dailyAvg, { decimals: false })}
          </Text>
          {budget ? (
            <Text className={`mt-1 text-sm ${data.total > budget ? 'text-danger' : 'text-muted'}`}>
              Bütçe: %{Math.round((data.total / budget) * 100)}
            </Text>
          ) : (
            <Text className="mt-1 text-sm text-muted">günde</Text>
          )}
        </Card>
      </View>

      {data.list.length === 0 ? (
        <View className="mt-6">
          <EmptyState icon="pie-chart-outline" title="Bu ay için veri yok" message="Harcama ekledikçe raporlar burada görünecek." />
        </View>
      ) : (
        <>
          <SectionTitle title="Kategorilere göre" />
          <Card>
            {data.categories.map((c, index) => {
              const cat = getCategory(c.id);
              return (
                <View key={c.id} className={index > 0 ? 'mt-4' : ''}>
                  <View className="mb-2 flex-row items-center">
                    <CategoryIcon category={c.id} size={36} />
                    <View className="ml-3 flex-1">
                      <Text className="text-base font-semibold text-ink">{cat.label}</Text>
                      <Text className="text-sm text-muted">
                        {c.count} harcama · %{Math.round(c.share * 100)}
                      </Text>
                    </View>
                    <Text className="text-base font-bold text-ink">{formatMoney(c.total, { decimals: false })}</Text>
                  </View>
                  <ProgressBar value={c.share} color={cat.color} />
                </View>
              );
            })}
          </Card>

          {data.biggest ? (
            <>
              <SectionTitle title="En büyük harcama" />
              <Card className="flex-row items-center">
                <CategoryIcon category={data.biggest.category} size={44} />
                <Text className="ml-3 flex-1 text-lg font-semibold text-ink" numberOfLines={1}>
                  {data.biggest.title}
                </Text>
                <Text className="text-lg font-bold text-ink">{formatMoney(data.biggest.amount)}</Text>
              </Card>
            </>
          ) : null}

          {data.merchants.length > 1 ? (
            <>
              <SectionTitle title="En çok harcanan yerler" />
              <Card>
                {data.merchants.map((m, index) => (
                  <View
                    key={m.title}
                    className={`flex-row items-center py-2.5 ${index > 0 ? 'border-t border-line' : ''}`}
                  >
                    <Text className="w-8 text-lg font-bold text-faint">{index + 1}</Text>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                        {m.title}
                      </Text>
                      <Text className="text-sm text-muted">{m.count} kez</Text>
                    </View>
                    <Text className="text-base font-bold text-ink">{formatMoney(m.total, { decimals: false })}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}

      <SectionTitle title="Son 6 ay" />
      <Card>
        <View className="flex-row items-end justify-between" style={{ height: CHART_HEIGHT + 44 }}>
          {data.months.map((m) => {
            const selected = m.key === month;
            const h = Math.max(4, (m.total / maxMonth) * CHART_HEIGHT);
            const monthIndex = Number(m.key.split('-')[1]) - 1;
            return (
              <View key={m.key} className="flex-1 items-center">
                <Text className="mb-1 text-xs font-semibold text-muted">{m.total ? formatMoneyShort(m.total) : ''}</Text>
                <View
                  style={{ height: h, backgroundColor: selected ? COLORS.primary : COLORS.line }}
                  className="w-8 rounded-lg"
                />
                <Text className={`mt-2 text-sm ${selected ? 'font-bold text-ink' : 'text-muted'}`}>
                  {MONTHS_SHORT[monthIndex]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
