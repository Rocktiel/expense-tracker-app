import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { AccountForm } from '@/components/AccountForm';
import { Button, EmptyState, Screen } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';

export default function EditAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAppStore((s) => s.accounts.find((a) => a.id === id));
  const updateAccount = useAppStore((s) => s.updateAccount);
  const deleteAccount = useAppStore((s) => s.deleteAccount);

  if (!account) {
    return (
      <Screen title="Hesabı Düzenle">
        <EmptyState icon="wallet-outline" title="Hesap bulunamadı">
          <Button title="Geri dön" variant="secondary" onPress={() => router.back()} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <AccountForm
      title="Hesabı Düzenle"
      initial={account}
      submitLabel="Değişiklikleri kaydet"
      onSubmit={(values) => {
        updateAccount(account.id, values);
        router.back();
      }}
      onDelete={() =>
        Alert.alert('Hesap silinsin mi?', `"${account.name}" silinecek.`, [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => {
              router.dismissAll();
              deleteAccount(account.id);
            },
          },
        ])
      }
    />
  );
}
