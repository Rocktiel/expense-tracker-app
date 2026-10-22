import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExpenseRow } from '@/components/ExpenseRow';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Chip, EmptyState } from '@/components/ui';
import { CATEGORY_LIST, type CategoryId } from '@/lib/categories';
import { formatMoney, formatRelativeDay, monthKey, normalizeSearch, startOfDay } from '@/lib/format';
import { sumAmounts } from '@/lib/stats';
import { COLORS } from '@/lib/theme';
import type { Expense } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

interface Section {
  key: string;
  title: string;
  total: number;
  data: Expense[];
}

export default function Expenses() {
  const insets = useSafeAreaInsets();
  const expenses = useAppStore((s) => s.expenses);
  const [month, setMonth] = useState(() => monthKey(Date.now()));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | null>(null);

  const searching = query.trim().length > 0;

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    return expenses.filter((e) => {
      if (!searching && monthKey(e.date) !== month) return false;
      if (category && e.category !== category) return false;
      if (!q) return true;
      const haystack = normalizeSearch(
        [e.title, e.note ?? '', ...(e.items ?? []).map((i) => i.name)].join(' '),
      );
      return haystack.includes(q);
    });
  }, [expenses, month, query, category, searching]);

  const sections = useMemo(() => {
    const map = new Map<number, Expense[]>();
    for (const e of filtered) {
      const day = startOfDay(e.date);
      const list = map.get(day);
      if (list) list.push(e);
      else map.set(day, [e]);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map<Section>(([day, data]) => ({
        key: String(day),
        title: formatRelativeDay(day, { weekday: true }),
        total: sumAmounts(data),
        data,
      }));
  }, [filtered]);

  const total = sumAmounts(filtered);

  const header = (
    <View>
      <Text className="mb-4 text-3xl font-bold text-ink">Giderler</Text>

      <View className="mb-3 min-h-[54px] flex-row items-center rounded-2xl border border-line bg-surface2 px-4">
        <Ionicons name="search" size={22} color={COLORS.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ara: market, ekmek, fatura..."
          placeholderTextColor={COLORS.faint}
          selectionColor={COLORS.primary}
          returnKeyType="search"
          className="ml-2 flex-1 py-3 text-lg text-ink"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Aramayı temizle">
            <Ionicons name="close-circle" size={22} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      {searching ? (
        <Text className="mb-3 text-base text-muted">Tüm aylarda aranıyor</Text>
      ) : (
        <MonthSwitcher value={month} onChange={setMonth} />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-2" contentContainerClassName="px-4">
        <Chip label="Tümü" selected={category === null} onPress={() => setCategory(null)} />
        {CATEGORY_LIST.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            color={c.color}
            selected={category === c.id}
            onPress={() => setCategory(category === c.id ? null : c.id)}
          />
        ))}
      </ScrollView>

      {filtered.length ? (
        <View className="mb-2 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3">
          <Text className="text-base text-muted">{filtered.length} harcama</Text>
          <Text className="text-xl font-bold text-ink">{formatMoney(total)}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 16 }}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => (
          <View className="mb-2 mt-4 flex-row items-center justify-between px-1">
            <Text className="text-base font-bold text-muted">{section.title}</Text>
            <Text className="text-base font-semibold text-muted">{formatMoney(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View className="mb-2">
            <ExpenseRow
              expense={item}
              showDay={false}
              onPress={() => router.push({ pathname: '/expense/[id]', params: { id: item.id } })}
            />
          </View>
        )}
        ListEmptyComponent={
          <View className="mt-4">
            <EmptyState
              icon={searching ? 'search' : 'wallet-outline'}
              title={searching ? 'Sonuç bulunamadı' : 'Bu ay harcama yok'}
              message={searching ? 'Farklı bir kelimeyle aramayı deneyin.' : 'Ana sayfadan fiş tarayarak veya elle harcama ekleyebilirsiniz.'}
            />
          </View>
        }
      />
    </View>
  );
}
