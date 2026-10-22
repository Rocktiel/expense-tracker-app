import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { DateField } from '@/components/DateField';
import { Button, Card, Chip, EmptyState, FieldLabel, InfoBanner, Input, Screen } from '@/components/ui';
import { CATEGORY_LIST, type CategoryId } from '@/lib/categories';
import { saveAttachment } from '@/lib/files';
import { amountToInput, formatMoney, paymentLabel, parseAmount } from '@/lib/format';
import { findDuplicate } from '@/lib/stats';
import { COLORS } from '@/lib/theme';
import type { ExpenseInput, LineItem, PaymentMethod } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { useScanStore, type ScanFile } from '@/store/useScanStore';

interface Draft {
  include: boolean;
  title: string;
  amountText: string;
  date: number;
  dateMissing: boolean;
  category: CategoryId;
  paymentMethod?: PaymentMethod;
  note?: string;
  items: LineItem[];
  fileIndexes: number[];
}

function ItemsList({ items, total }: { items: LineItem[]; total: number }) {
  const [open, setOpen] = useState(items.length <= 5);
  const sum = Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100;
  const mismatch = items.length > 1 && Math.abs(sum - total) > 0.05;
  if (!items.length) return null;

  return (
    <View className="mb-4">
      <Pressable onPress={() => setOpen(!open)} className="flex-row items-center justify-between py-2 active:opacity-60">
        <Text className="text-base font-semibold text-muted">{items.length} kalem</Text>
        <View className="flex-row items-center">
          <Text className="mr-1 text-base font-semibold text-primary">{open ? 'Gizle' : 'Göster'}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primary} />
        </View>
      </Pressable>
      {open ? (
        <View className="rounded-2xl bg-surface2 px-3 py-1">
          {items.map((item, index) => (
            <View
              key={`${item.name}-${index}`}
              className={`flex-row items-center py-2 ${index > 0 ? 'border-t border-line' : ''}`}
            >
              <Text className="flex-1 text-base text-ink" numberOfLines={2}>
                {item.quantity ? `${item.quantity} × ` : ''}
                {item.name}
              </Text>
              <Text className={`ml-2 text-base font-semibold ${item.price < 0 ? 'text-primary' : 'text-ink'}`}>
                {formatMoney(item.price)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {mismatch ? (
        <Text className="mt-2 text-sm leading-5 text-warn">
          Kalemlerin toplamı {formatMoney(sum)}. Fiş toplamı ile farklı; tutarı kontrol edin.
        </Text>
      ) : null}
    </View>
  );
}

function confirmLeave() {
  Alert.alert('Kaydetmeden çıkılsın mı?', 'Okunan fiş bilgileri kaybolacak.', [
    { text: 'Kal', style: 'cancel' },
    { text: 'Çık', style: 'destructive', onPress: () => router.back() },
  ]);
}

export default function Review() {
  const files = useScanStore((s) => s.files);
  const receipts = useScanStore((s) => s.receipts);
  const clear = useScanStore((s) => s.clear);
  const expenses = useAppStore((s) => s.expenses);
  const addExpenses = useAppStore((s) => s.addExpenses);
  const accounts = useAppStore((s) => s.accounts);
  const defaultAccountId = useAppStore((s) => s.defaultAccountId);

  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>(defaultAccountId ?? accounts[0]?.id);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    receipts.map((r) => ({
      include: true,
      title: r.merchant,
      amountText: amountToInput(r.total),
      date: r.date ?? Date.now(),
      dateMissing: !r.date,
      category: r.category,
      paymentMethod: r.paymentMethod,
      note: r.note,
      items: r.items,
      fileIndexes: r.fileIndexes,
    })),
  );

  const update = (index: number, patch: Partial<Draft>) =>
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const selected = drafts.filter((d) => d.include);
  const selectedTotal = useMemo(
    () => selected.reduce((s, d) => s + (Number.isFinite(parseAmount(d.amountText)) ? parseAmount(d.amountText) : 0), 0),
    [selected],
  );

  const save = async () => {
    for (const d of selected) {
      const amount = parseAmount(d.amountText);
      if (!Number.isFinite(amount) || amount <= 0) {
        Alert.alert('Tutar hatalı', `"${d.title || 'Fiş'}" için geçerli bir tutar girin.`);
        return;
      }
      if (!d.title.trim()) {
        Alert.alert('Başlık eksik', 'Lütfen her fiş için bir başlık (mağaza adı) yazın.');
        return;
      }
    }

    setSaving(true);
    try {
      const inputs: ExpenseInput[] = [];
      for (const d of selected) {
        const attachments: string[] = [];
        for (const i of d.fileIndexes) {
          const f: ScanFile | undefined = files[i];
          if (!f) continue;
          try {
            attachments.push(await saveAttachment(f.uri, f.kind === 'pdf' ? 'pdf' : 'jpg'));
          } catch {
            // Fotoğraf kopyalanamazsa gider yine de kaydedilsin
          }
        }
        inputs.push({
          title: d.title.trim(),
          amount: Math.round(parseAmount(d.amountText) * 100) / 100,
          date: d.date,
          category: d.category,
          paymentMethod: d.paymentMethod,
          accountId,
          note: d.note?.trim() || undefined,
          items: d.items.length ? d.items : undefined,
          attachments: attachments.length ? attachments : undefined,
          source: 'scan',
        });
      }
      addExpenses(inputs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      clear();
      router.dismissAll();
      setTimeout(() => {
        Alert.alert('Kaydedildi', inputs.length > 1 ? `${inputs.length} fiş eklendi.` : 'Fiş eklendi.');
      }, 300);
    } catch {
      Alert.alert('Hata', 'Kaydedilirken bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };


  // Android'in geri tuşu da onay sorsun; yanlışlıkla basınca okunan fişler kaybolmasın
  const hasDrafts = drafts.length > 0;
  useEffect(() => {
    if (!hasDrafts) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [hasDrafts]);

  if (!drafts.length) {
    return (
      <Screen title="Kontrol Et">
        <EmptyState icon="receipt-outline" title="Okunan fiş yok" message="Lütfen tekrar fiş tarayın.">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <>
      <Screen
        title="Kontrol Et"
        onBack={confirmLeave}
        keyboard
        footer={
          <Button
            title={
              selected.length
                ? `Kaydet (${selected.length > 1 ? `${selected.length} fiş · ` : ''}${formatMoney(selectedTotal)})`
                : 'Kaydedilecek fiş seçin'
            }
            icon="checkmark-circle"
            onPress={save}
            loading={saving}
            disabled={!selected.length}
          />
        }
      >
        <InfoBanner icon="checkmark-done">
          {drafts.length > 1
            ? `${drafts.length} fiş bulundu. Bilgileri kontrol edip kaydedin.`
            : 'Fiş okundu. Bilgileri kontrol edip kaydedin.'}
        </InfoBanner>

        {accounts.length ? (
          <>
            <FieldLabel>Hangi hesaptan ödendi?</FieldLabel>
            <View className="mb-4 flex-row flex-wrap">
              <Chip label="Hesapsız" selected={!accountId} onPress={() => setAccountId(undefined)} />
              {accounts.map((a) => (
                <Chip
                  key={a.id}
                  label={a.name}
                  icon="wallet-outline"
                  selected={accountId === a.id}
                  onPress={() => setAccountId(accountId === a.id ? undefined : a.id)}
                />
              ))}
            </View>
          </>
        ) : null}

        {drafts.map((d, index) => {
          const amount = parseAmount(d.amountText);
          const duplicate = Number.isFinite(amount) ? findDuplicate(expenses, { title: d.title, amount, date: d.date }) : undefined;
          return (
            <Card key={index} className={`mb-4 ${d.include ? '' : 'opacity-50'}`}>
              {drafts.length > 1 ? (
                <Pressable
                  onPress={() => update(index, { include: !d.include })}
                  className="mb-3 flex-row items-center active:opacity-60"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: d.include }}
                >
                  <Ionicons
                    name={d.include ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={d.include ? COLORS.primary : COLORS.muted}
                  />
                  <Text className="ml-2 text-lg font-bold text-ink">{index + 1}. fiş</Text>
                  {!d.include ? <Text className="ml-2 text-base text-muted">(kaydedilmeyecek)</Text> : null}
                </Pressable>
              ) : null}

              {d.fileIndexes.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                  {d.fileIndexes.map((i) =>
                    files[i] ? (
                      <View key={i} className="mr-2 h-24 w-20 overflow-hidden rounded-xl border border-line bg-surface2">
                        {files[i].kind === 'image' ? (
                          <Image source={{ uri: files[i].uri }} className="h-full w-full" resizeMode="cover" />
                        ) : (
                          <View className="flex-1 items-center justify-center">
                            <Ionicons name="document-text" size={30} color={COLORS.danger} />
                          </View>
                        )}
                      </View>
                    ) : null,
                  )}
                </ScrollView>
              ) : null}

              {duplicate ? (
                <InfoBanner tone="warn" icon="copy">
                  {`Bu fiş daha önce eklenmiş olabilir: aynı gün, aynı tutarda "${duplicate.title}" kaydı var.`}
                </InfoBanner>
              ) : null}

              <Input label="Mağaza / Başlık" value={d.title} onChangeText={(t) => update(index, { title: t })} />

              <FieldLabel>Tutar</FieldLabel>
              <View className="mb-5 min-h-[64px] flex-row items-center rounded-2xl border border-line bg-surface2 px-4">
                <TextInput
                  value={d.amountText}
                  onChangeText={(t) => update(index, { amountText: t.replace(/[^\d.,]/g, '') })}
                  keyboardType="decimal-pad"
                  selectionColor={COLORS.primary}
                  className="flex-1 py-3 text-3xl font-bold text-ink"
                  accessibilityLabel="Tutar"
                />
                <Text className="ml-2 text-2xl font-bold text-muted">₺</Text>
              </View>

              <DateField value={d.date} onChange={(ts) => update(index, { date: ts, dateMissing: false })} />
              {d.dateMissing ? (
                <Text className="-mt-3 mb-4 text-sm text-warn">Fişte tarih okunamadı, bugünün tarihi seçildi.</Text>
              ) : null}

              <FieldLabel>Kategori</FieldLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mb-3" contentContainerClassName="px-4">
                {CATEGORY_LIST.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.label}
                    icon={c.icon}
                    color={c.color}
                    selected={d.category === c.id}
                    onPress={() => update(index, { category: c.id })}
                  />
                ))}
              </ScrollView>

              {d.paymentMethod || d.note ? (
                <View className="mb-3 flex-row flex-wrap">
                  {d.paymentMethod ? (
                    <View className="mb-2 mr-2 flex-row items-center rounded-full bg-surface2 px-3 py-1.5">
                      <Ionicons name="wallet-outline" size={16} color={COLORS.muted} />
                      <Text className="ml-1 text-sm text-muted">{paymentLabel(d.paymentMethod)}</Text>
                    </View>
                  ) : null}
                  {d.note ? (
                    <View className="mb-2 mr-2 flex-row items-center rounded-full bg-surface2 px-3 py-1.5">
                      <Ionicons name="chatbox-ellipses-outline" size={16} color={COLORS.muted} />
                      <Text className="ml-1 text-sm text-muted">{d.note}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <ItemsList items={d.items} total={Number.isFinite(amount) ? amount : 0} />
            </Card>
          );
        })}
      </Screen>
    </>
  );
}
