import { Text, View } from 'react-native';

import { monthKey, monthLabel, shiftMonth } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';

import { IconButton } from './ui';

export function MonthSwitcher({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const current = monthKey(useNow());
  const isCurrent = value >= current;
  return (
    <View className="mb-4 flex-row items-center justify-between rounded-2xl border border-line bg-surface px-2 py-2">
      <IconButton icon="chevron-back" label="Önceki ay" onPress={() => onChange(shiftMonth(value, -1))} />
      <Text className="text-xl font-bold text-ink">{monthLabel(value)}</Text>
      <IconButton
        icon="chevron-forward"
        label="Sonraki ay"
        color={isCurrent ? COLORS.line : COLORS.ink}
        onPress={() => {
          if (!isCurrent) onChange(shiftMonth(value, 1));
        }}
      />
    </View>
  );
}
