import { router } from 'expo-router';

import { AccountForm } from '@/components/AccountForm';
import { useAppStore } from '@/store/useAppStore';

export default function NewAccount() {
  const addAccount = useAppStore((s) => s.addAccount);
  const setDefaultAccount = useAppStore((s) => s.setDefaultAccount);

  return (
    <AccountForm
      title="Hesap Ekle"
      submitLabel="Hesabı kaydet"
      onSubmit={(values) => {
        const account = addAccount(values);
        setDefaultAccount(account.id);
        router.back();
      }}
    />
  );
}
