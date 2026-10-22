import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { getCategory } from '@/lib/categories';
import { accountName } from '@/lib/accounts';
import { formatMoney, formatRelativeDay, formatTime } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import type { Expense } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

export function CategoryIcon({ category, size = 48 }: { category: string; size?: number }) {
  const c = getCategory(category);
  return (
    <View
      style={{ width: size, height: size, backgroundColor: `${c.color}26`, borderRadius: size * 0.32 }}
      className="items-center justify-center"
    >
      <Ionicons name={c.icon} size={size * 0.5} color={c.color} />
    </View>
  );
}

function ExpenseRowBase({
  expense,
  onPress,
  showDay = true,
}: {
  expense: Expense;
  onPress: () => void;
  showDay?: boolean;
}) {
  const c = getCategory(expense.category);
  const accounts = useAppStore((s) => s.accounts);
  const account = accountName(accounts, expense.accountId);
  const meta = [showDay ? formatRelativeDay(expense.date) : formatTime(expense.date), c.label, account]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${expense.title}, ${formatMoney(expense.amount)}`}
      className="min-h-[72px] flex-row items-center rounded-2xl bg-surface px-3 py-3 active:opacity-70"
    >
      <CategoryIcon category={expense.category} />
      <View className="ml-3 flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {expense.title}
        </Text>
        <View className="mt-0.5 flex-row items-center">
          {expense.source === 'scan' ? (
            <Ionicons name="receipt-outline" size={14} color={COLORS.muted} style={{ marginRight: 4 }} />
          ) : null}
          {expense.source === 'recurring' ? (
            <Ionicons name="repeat" size={14} color={COLORS.muted} style={{ marginRight: 4 }} />
          ) : null}
          <Text className="text-sm text-muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
      <Text className="ml-2 text-lg font-bold text-ink">{formatMoney(expense.amount)}</Text>
    </Pressable>
  );
}

export const ExpenseRow = memo(ExpenseRowBase);
