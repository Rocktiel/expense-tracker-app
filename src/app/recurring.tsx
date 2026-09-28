import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ExpenseRow';
import { AmountInput, Button, Card, Chip, EmptyState, FieldLabel, IconButton, InfoBanner, Input, Screen, SectionTitle } from '@/components/ui';
import { CATEGORY_LIST, type CategoryId } from '@/lib/categories';
import { formatMoney, monthLabel, monthKey, parseAmount } from '@/lib/format';
import { RepeatMonthsPicker } from '@/components/RepeatMonthsPicker';
import { recurringEndMonth, upcomingPayments, type UpcomingPayment } from '@/lib/stats';
import { COLORS } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { useAppStore } from '@/store/useAppStore';

function AddForm({ onDone }: { onDone: () => void }) {
  const addRecurring = useAppStore((s) => s.addRecurring);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryId>('fatura');
  const [day, setDay] = useState(() => new Date().getDate());
  const [months, setMonths] = useState<number | null>(null);
  const [startMonth] = useState(() => monthKey(Date.now()));

  const save = () => {
    const value = parseAmount(amount);
    if (!title.trim()) return Alert.alert('Başlık eksik', 'Örneğin: Konut kredisi, Telefon faturası');
    if (!Number.isFinite(value) || value <= 0) return Alert.alert('Tutar eksik', 'Lütfen aylık tutarı girin.');
    addRecurring({
      title: title.trim(),
      amount: Math.round(value * 100) / 100,
      category,
      dayOfMonth: day,
      startMonth,
      totalMonths: months ?? undefined,
    });
    onDone();
  };

  return (
    <Card className="mb-4">
      <Text className="mb-4 text-xl font-bold text-ink">Yeni düzenli ödeme</Text>
      <Input label="Ne ödemesi?" value={title} onChangeText={setTitle} placeholder="Örn: Konut kredisi, İnternet" autoFocus />
      <AmountInput value={amount} onChangeText={setAmount} />

      <FieldLabel>Kategori</FieldLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-4" contentContainerClassName="px-4">
        {CATEGORY_LIST.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={c.icon}
            color={c.color}
            selected={category === c.id}
            onPress={() => setCategory(c.id)}
          />
        ))}
      </ScrollView>

      <FieldLabel>Her ayın kaçında ödeniyor?</FieldLabel>
      <View className="mb-5 flex-row items-center justify-center rounded-2xl border border-line bg-surface2 py-2">
        <IconButton icon="remove" label="Azalt" onPress={() => setDay((d) => (d <= 1 ? 31 : d - 1))} />
        <Text className="mx-8 text-3xl font-bold text-ink">{day}</Text>
        <IconButton icon="add" label="Artır" onPress={() => setDay((d) => (d >= 31 ? 1 : d + 1))} />
      </View>

      <RepeatMonthsPicker value={months} onChange={setMonths} startMonth={startMonth} amount={parseAmount(amount)} />
      {months !== null ? (
        <Text className="mt-2 text-sm leading-5 text-faint">
          Kredi yarıdaysa kalan taksit sayısını seçin. İlk taksit bu ay sayılır.
        </Text>
      ) : null}
      <View className="mb-5" />

      <View className="flex-row gap-3">
        <Button title="Vazgeç" variant="secondary" onPress={onDone} className="flex-1" />
        <Button title="Ekle" icon="add-circle" onPress={save} className="flex-[2]" />
      </View>
    </Card>
  );
}

function PaymentRow({
  entry,
  onPaid,
  onUndo,
  onDelete,
}: {
  entry: UpcomingPayment;
  onPaid: () => void;
  onUndo: () => void;
  onDelete: () => void;
}) {
  const { item, paid, daysLeft, status, installment } = entry;
  const end = recurringEndMonth(item);
  const detail =
    status === 'finished'
      ? `${item.totalMonths} taksit tamamlandı`
      : installment
        ? `${installment.current}/${installment.total}. taksit · son: ${monthLabel(end ?? '')}`
        : item.totalMonths && end
          ? `${item.totalMonths} ay · son: ${monthLabel(end)}`
          : 'Süresiz';

  return (
    <View className={`rounded-2xl bg-surface p-3 ${status === 'finished' ? 'opacity-60' : ''}`}>
      <View className="flex-row items-center">
        <CategoryIcon category={item.category} size={46} />
        <View className="ml-3 flex-1">
          <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
            {item.title}
          </Text>
          <Text className="text-sm text-muted">
            {formatMoney(item.amount)} · her ayın {item.dayOfMonth}. günü
          </Text>
          <View className="mt-0.5 flex-row items-center">
            <Ionicons name={item.totalMonths ? 'calendar-outline' : 'infinite'} size={14} color={COLORS.muted} />
            <Text className="ml-1 text-sm text-muted">{detail}</Text>
          </View>
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={10}
          accessibilityLabel={`${item.title} sil`}
          className="h-10 w-10 items-center justify-center active:opacity-60"
        >
          <Ionicons name="trash-outline" size={22} color={COLORS.faint} />
        </Pressable>
      </View>

      {status === 'active' ? (
        <View className="mt-3 flex-row items-center justify-between">
          {paid ? (
            <>
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />
                <Text className="ml-1.5 text-base font-semibold text-primary">Bu ay ödendi</Text>
              </View>
              <Pressable onPress={onUndo} hitSlop={8} className="active:opacity-60">
                <Text className="text-base text-muted">Geri al</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text
                className={`text-base font-semibold ${daysLeft < 0 ? 'text-danger' : daysLeft <= 3 ? 'text-warn' : 'text-muted'}`}
              >
                {daysLeft < 0 ? `${-daysLeft} gün gecikti` : daysLeft === 0 ? 'Bugün ödenecek' : `${daysLeft} gün kaldı`}
              </Text>
              <Button title="Ödendi" icon="checkmark" small onPress={onPaid} />
            </>
          )}
        </View>
      ) : status === 'notStarted' ? (
        <Text className="mt-3 text-base text-muted">
          Başlangıç: {monthLabel(item.startMonth ?? monthKey(item.createdAt))}
        </Text>
      ) : null}
    </View>
  );
}

export default function Recurring() {
  const recurring = useAppStore((s) => s.recurring);
  const markPaid = useAppStore((s) => s.markRecurringPaid);
  const undoPaid = useAppStore((s) => s.undoRecurringPaid);
  const deleteRecurring = useAppStore((s) => s.deleteRecurring);
  const [adding, setAdding] = useState(false);

  const now = useNow();
  const list = useMemo(() => upcomingPayments(recurring, new Date(now)), [recurring, now]);
  const current = list.filter((u) => u.status !== 'finished');
  const finished = list.filter((u) => u.status === 'finished');
  const active = list.filter((u) => u.status === 'active');
  const monthlyTotal = active.reduce((s, u) => s + u.item.amount, 0);
  const unpaidTotal = active.filter((u) => !u.paid).reduce((s, u) => s + u.item.amount, 0);

  const confirmDelete = (id: string, title: string) =>
    Alert.alert('Silinsin mi?', `"${title}" düzenli ödemelerden kaldırılacak. Geçmiş harcamalar silinmez.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteRecurring(id) },
    ]);

  const confirmPaid = (id: string, title: string, amount: number) =>
    Alert.alert('Ödendi mi?', `${title} (${formatMoney(amount)}) bu ayın giderlerine eklenecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Evet, ödendi', onPress: () => markPaid(id) },
    ]);

  const confirmUndo = (id: string, title: string) =>
    Alert.alert('Geri alınsın mı?', `${title} için bu ay eklenen gider silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Geri al', style: 'destructive', onPress: () => undoPaid(id) },
    ]);

  return (
    <Screen title="Düzenli Ödemeler" keyboard>
      {!adding ? (
        <Button title="Düzenli ödeme ekle" icon="add-circle" onPress={() => setAdding(true)} className="mb-4" />
      ) : (
        <AddForm onDone={() => setAdding(false)} />
      )}

      {recurring.length ? (
        <>
          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-sm font-semibold text-muted">Aylık toplam</Text>
              <Text className="mt-1 text-xl font-bold text-ink" adjustsFontSizeToFit numberOfLines={1}>
                {formatMoney(monthlyTotal, { decimals: false })}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-sm font-semibold text-muted">Bu ay kalan</Text>
              <Text
                className={`mt-1 text-xl font-bold ${unpaidTotal ? 'text-warn' : 'text-primary'}`}
                adjustsFontSizeToFit
                numberOfLines={1}
              >
                {unpaidTotal ? formatMoney(unpaidTotal, { decimals: false }) : 'Hepsi ödendi'}
              </Text>
            </Card>
          </View>

          <SectionTitle title={monthLabel(monthKey(now))} />
          {current.length ? (
            <View className="gap-2">
              {current.map((u) => (
                <PaymentRow
                  key={u.item.id}
                  entry={u}
                  onPaid={() => confirmPaid(u.item.id, u.item.title, u.item.amount)}
                  onUndo={() => confirmUndo(u.item.id, u.item.title)}
                  onDelete={() => confirmDelete(u.item.id, u.item.title)}
                />
              ))}
            </View>
          ) : (
            <Text className="text-base text-muted">Bu ay için ödeme yok.</Text>
          )}

          {finished.length ? (
            <>
              <SectionTitle title="Tamamlananlar" />
              <View className="gap-2">
                {finished.map((u) => (
                  <PaymentRow
                    key={u.item.id}
                    entry={u}
                    onPaid={() => undefined}
                    onUndo={() => undefined}
                    onDelete={() => confirmDelete(u.item.id, u.item.title)}
                  />
                ))}
              </View>
            </>
          ) : null}
          <View className="mt-4">
            <InfoBanner icon="information-circle">
              {'"Ödendi" dediğinizde tutar otomatik olarak bu ayın giderlerine eklenir.'}
            </InfoBanner>
          </View>
        </>
      ) : !adding ? (
        <EmptyState
          icon="repeat"
          title="Düzenli ödeme yok"
          message="Kredi taksidi, kira, telefon/internet faturası gibi her ay ödediklerinizi ekleyin. Ödeme günü yaklaşınca ana sayfada görünür."
        />
      ) : null}
    </Screen>
  );
}
