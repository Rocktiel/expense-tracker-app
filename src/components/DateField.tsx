import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';

import { formatDate, isSameDay } from '@/lib/format';
import { useNow } from '@/lib/useNow';
import { COLORS } from '@/lib/theme';

import { Button, Chip, FieldLabel } from './ui';

/** Seçilen günü korur, saati mevcut değerden alır */
function withTimeOf(day: Date, source: number): number {
  const s = new Date(source);
  const d = new Date(day);
  d.setHours(s.getHours(), s.getMinutes(), 0, 0);
  return d.getTime();
}

export function DateField({ value, onChange, label = 'Tarih' }: { value: number; onChange: (ts: number) => void; label?: string }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(new Date(value));

  const now = useNow();
  const yesterday = now - 86_400_000;
  const isToday = isSameDay(value, now);
  const isYesterday = isSameDay(value, yesterday);

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: new Date(value),
        mode: 'date',
        maximumDate: new Date(Date.now()),
        onValueChange: (_event, date) => {
          if (date) onChange(withTimeOf(date, value));
        },
      });
    } else {
      setIosDraft(new Date(value));
      setIosOpen(true);
    }
  };

  return (
    <View className="mb-5">
      <FieldLabel>{label}</FieldLabel>
      <View className="flex-row flex-wrap">
        <Chip label="Bugün" selected={isToday} onPress={() => onChange(withTimeOf(new Date(now), isToday ? value : now))} />
        <Chip label="Dün" selected={isYesterday} onPress={() => onChange(withTimeOf(new Date(yesterday), value))} />
        <Chip
          label={isToday || isYesterday ? 'Başka gün' : formatDate(value)}
          icon="calendar"
          selected={!isToday && !isYesterday}
          onPress={openPicker}
        />
      </View>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="fade" onRequestClose={() => setIosOpen(false)}>
          <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setIosOpen(false)}>
            <Pressable className="rounded-t-3xl bg-surface px-4 pb-10 pt-4" onPress={() => undefined}>
              <Text className="mb-2 text-center text-xl font-bold text-ink">Tarih seçin</Text>
              <DateTimePicker
                value={iosDraft}
                mode="date"
                display="inline"
                themeVariant="dark"
                accentColor={COLORS.primary}
                maximumDate={new Date(now + 60_000)}
                locale="tr-TR"
                onValueChange={(_event, date) => setIosDraft(date)}
              />
              <Button
                title="Tamam"
                className="mt-3"
                onPress={() => {
                  onChange(withTimeOf(iosDraft, value));
                  setIosOpen(false);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}
