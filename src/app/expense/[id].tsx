import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CategoryIcon } from '@/components/ExpenseRow';
import { Button, Card, EmptyState, Screen, SectionTitle } from '@/components/ui';
import { getCategory } from '@/lib/categories';
import { accountName } from '@/lib/accounts';
import { shareFile } from '@/lib/exportData';
import { attachmentUri, isPdf } from '@/lib/files';
import { formatDate, formatMoney, formatTime, paymentLabel } from '@/lib/format';
import { COLORS } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';

const SOURCE_LABEL = { manual: 'Elle eklendi', scan: 'Fişten okundu', recurring: 'Düzenli ödeme' } as const;

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start border-t border-line py-3">
      <Text className="w-28 text-base text-muted">{label}</Text>
      <Text className="flex-1 text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}

export default function ExpenseDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const expense = useAppStore((s) => s.expenses.find((e) => e.id === id));
  const accounts = useAppStore((s) => s.accounts);
  const deleteExpense = useAppStore((s) => s.deleteExpense);
  const [viewer, setViewer] = useState<{ uri: string; aspect: number } | null>(null);

  if (!expense) {
    return (
      <Screen title="Gider Detayı">
        <EmptyState icon="alert-circle-outline" title="Kayıt bulunamadı" message="Bu harcama silinmiş olabilir.">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  const category = getCategory(expense.category);
  const itemsTotal = (expense.items ?? []).reduce((s, i) => s + i.price, 0);

  const remove = () => {
    Alert.alert('Silinsin mi?', `"${expense.title}" (${formatMoney(expense.amount)}) silinecek.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteExpense(expense.id);
        },
      },
    ]);
  };

  const openAttachment = async (name: string) => {
    const uri = attachmentUri(name);
    if (isPdf(name)) {
      try {
        await shareFile(uri, 'application/pdf', 'Faturayı aç');
      } catch {
        Alert.alert('Açılamadı', 'PDF dosyası açılamadı.');
      }
    } else {
      Image.getSize(
        uri,
        (w, h) => setViewer({ uri, aspect: w && h ? w / h : 0.6 }),
        () => setViewer({ uri, aspect: 0.6 }),
      );
    }
  };

  return (
    <>
      <Screen
        title="Gider Detayı"
        footer={
          <View className="flex-row gap-3">
            <Button title="Sil" icon="trash" variant="danger" onPress={remove} className="flex-1" />
            <Button
              title="Düzenle"
              icon="create"
              onPress={() => router.push({ pathname: '/expense/edit/[id]', params: { id: expense.id } })}
              className="flex-[2]"
            />
          </View>
        }
      >
        <Card className="items-center p-6">
          <CategoryIcon category={expense.category} size={64} />
          <Text className="mt-3 text-center text-2xl font-bold text-ink">{expense.title}</Text>
          <Text className="mt-2 text-4xl font-bold text-ink" adjustsFontSizeToFit numberOfLines={1}>
            {formatMoney(expense.amount)}
          </Text>
          <Text className="mt-2 text-base text-muted">
            {formatDate(expense.date, { weekday: true })} · {formatTime(expense.date)}
          </Text>
        </Card>

        <Card className="mt-4 py-1">
          <View className="flex-row items-start py-3">
            <Text className="w-28 text-base text-muted">Kategori</Text>
            <Text className="flex-1 text-base font-semibold" style={{ color: category.color }}>
              {category.label}
            </Text>
          </View>
          {expense.paymentMethod ? <InfoLine label="Ödeme" value={paymentLabel(expense.paymentMethod) ?? ''} /> : null}
          {accountName(accounts, expense.accountId) ? (
            <InfoLine label="Hesap" value={accountName(accounts, expense.accountId) ?? ''} />
          ) : null}
          <InfoLine label="Kaynak" value={SOURCE_LABEL[expense.source] ?? 'Elle eklendi'} />
          {expense.note ? <InfoLine label="Not" value={expense.note} /> : null}
        </Card>

        {expense.attachments?.length ? (
          <>
            <SectionTitle title="Fiş" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {expense.attachments.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => openAttachment(name)}
                  className="mr-3 h-40 w-28 overflow-hidden rounded-2xl border border-line bg-surface2 active:opacity-70"
                >
                  {isPdf(name) ? (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons name="document-text" size={40} color={COLORS.danger} />
                      <Text className="mt-1 text-sm text-muted">PDF</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: attachmentUri(name) }} className="h-full w-full" resizeMode="cover" />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {expense.items?.length ? (
          <>
            <SectionTitle title={`Ürünler (${expense.items.length})`} />
            <Card className="py-1">
              {expense.items.map((item, index) => (
                <View
                  key={`${item.name}-${index}`}
                  className={`flex-row items-center py-3 ${index > 0 ? 'border-t border-line' : ''}`}
                >
                  <Text className="flex-1 text-base text-ink">
                    {item.quantity ? <Text className="text-muted">{item.quantity} × </Text> : null}
                    {item.name}
                  </Text>
                  <Text className={`ml-3 text-base font-semibold ${item.price < 0 ? 'text-primary' : 'text-ink'}`}>
                    {formatMoney(item.price)}
                  </Text>
                </View>
              ))}
              {Math.abs(itemsTotal - expense.amount) > 0.05 && expense.items.length > 1 ? (
                <Text className="border-t border-line py-3 text-sm text-muted">
                  Ürünlerin toplamı: {formatMoney(itemsTotal)}
                </Text>
              ) : null}
            </Card>
          </>
        ) : null}
      </Screen>

      <Modal visible={viewer !== null} animationType="fade" onRequestClose={() => setViewer(null)} statusBarTranslucent>
        <View className="flex-1 bg-black">
          <ScrollView
            maximumZoomScale={4}
            minimumZoomScale={1}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            centerContent
          >
            {viewer ? (
              <Image source={{ uri: viewer.uri }} style={{ width: '100%', aspectRatio: viewer.aspect }} resizeMode="contain" />
            ) : null}
          </ScrollView>
          <Pressable
            onPress={() => setViewer(null)}
            accessibilityLabel="Kapat"
            style={{ top: insets.top + 12 }}
            className="absolute right-4 h-12 w-12 items-center justify-center rounded-full bg-white/20 active:opacity-60"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
