import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { COLORS } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const setUserName = useAppStore((s) => s.setUserName);
  const [name, setName] = useState('');

  const start = () => {
    if (!name.trim()) return;
    setUserName(name);
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="flex-1 justify-center px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-[32px] bg-primary/15">
          <Ionicons name="wallet" size={52} color={COLORS.primary} />
        </View>
        <Text className="text-4xl font-bold text-ink">Hoş geldiniz!</Text>
        <Text className="mt-3 text-lg leading-7 text-muted">
          Harcamalarınızı kolayca takip edin. Fişin fotoğrafını çekin, gerisini uygulama halletsin.
        </Text>

        <Text className="mb-2 mt-10 text-lg font-semibold text-ink">Adınız nedir?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Adınızı yazın"
          placeholderTextColor={COLORS.faint}
          selectionColor={COLORS.primary}
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={start}
          accessibilityLabel="Adınız"
          className="min-h-[64px] rounded-2xl border border-line bg-surface2 px-5 text-2xl text-ink"
        />

        <Button title="Başla" icon="arrow-forward-circle" onPress={start} disabled={!name.trim()} className="mt-6" />
        <Text className="mt-4 text-center text-sm text-faint">Tüm bilgileriniz sadece bu telefonda saklanır.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}
