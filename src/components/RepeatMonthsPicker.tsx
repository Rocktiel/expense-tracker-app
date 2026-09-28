import { Text, View } from 'react-native';

import { formatMoney, monthLabel, shiftMonth } from '@/lib/format';

import { Chip, FieldLabel, IconButton } from './ui';

const PRESETS = [3, 6, 12, 24, 36];
const MIN_MONTHS = 2;
const MAX_MONTHS = 360;

/**
 * Düzenli ödemenin kaç ay süreceğini seçtirir.
 * value = null → süresiz (fatura, abonelik gibi); sayı → taksit sayısı.
 */
export function RepeatMonthsPicker({
  value,
  onChange,
  startMonth,
  amount,
}: {
  value: number | null;
  onChange: (months: number | null) => void;
  /** İlk ödeme ayı ("YYYY-MM"); son ödeme ayını göstermek için */
  startMonth: string;
  /** Aylık tutar; girildiyse toplam gösterilir */
  amount?: number;
}) {
  const step = (delta: number) => {
    const base = value ?? 12;
    onChange(Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, base + delta)));
  };

  return (
    <View>
      <FieldLabel>Kaç ay sürecek?</FieldLabel>
      <View className="flex-row flex-wrap">
        <Chip label="Süresiz" icon="infinite" selected={value === null} onPress={() => onChange(null)} />
        {PRESETS.map((m) => (
          <Chip key={m} label={`${m} ay`} selected={value === m} onPress={() => onChange(m)} />
        ))}
      </View>

      {value !== null ? (
        <>
          <View className="mt-2 flex-row items-center justify-center rounded-2xl border border-line bg-surface2 py-2">
            <IconButton icon="remove" label="Bir ay azalt" onPress={() => step(-1)} />
            <View className="mx-6 min-w-[96px] items-center">
              <Text className="text-3xl font-bold text-ink">{value}</Text>
              <Text className="text-sm text-muted">ay / taksit</Text>
            </View>
            <IconButton icon="add" label="Bir ay artır" onPress={() => step(1)} />
          </View>
          <Text className="mt-3 text-base leading-6 text-muted">
            Son ödeme: <Text className="font-semibold text-ink">{monthLabel(shiftMonth(startMonth, value - 1))}</Text>
            {amount && amount > 0 ? (
              <>
                {'\n'}Toplam: <Text className="font-semibold text-ink">{formatMoney(amount * value)}</Text>
              </>
            ) : null}
          </Text>
        </>
      ) : (
        <Text className="mt-1 text-base leading-6 text-muted">
          Siz silene kadar her ay hatırlatılır. Telefon, internet faturası, kira gibi ödemeler için.
        </Text>
      )}
    </View>
  );
}
