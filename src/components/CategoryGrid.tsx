import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { CATEGORY_LIST, type CategoryId } from '@/lib/categories';

/** Büyük, kolay dokunulan kategori kutuları (3 sütun) */
export function CategoryGrid({ value, onChange }: { value: CategoryId; onChange: (id: CategoryId) => void }) {
  return (
    <View className="-mx-1 mb-5 flex-row flex-wrap">
      {CATEGORY_LIST.map((c) => {
        const selected = c.id === value;
        return (
          <View key={c.id} className="w-1/3 p-1">
            <Pressable
              onPress={() => onChange(c.id)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={c.label}
              style={selected ? { borderColor: c.color, backgroundColor: `${c.color}22` } : undefined}
              className="min-h-[84px] items-center justify-center rounded-2xl border border-line bg-surface2 px-1 py-3 active:opacity-70"
            >
              <Ionicons name={c.icon} size={26} color={c.color} />
              <Text
                className={`mt-1.5 text-center text-sm font-semibold ${selected ? 'text-ink' : 'text-muted'}`}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {c.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
