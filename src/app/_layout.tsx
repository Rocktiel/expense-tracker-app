import '../global.css';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { COLORS } from '@/lib/theme';
import { useHydrated } from '@/store/useAppStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
SystemUI.setBackgroundColorAsync(COLORS.bg).catch(() => undefined);

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.bg,
    card: COLORS.bg,
    text: COLORS.ink,
    border: COLORS.line,
    notification: COLORS.danger,
  },
};

export default function RootLayout() {
  const hydrated = useHydrated();

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        {hydrated ? (
          <Stack
            screenOptions={{
              // Başlıkları kendimiz çiziyoruz (components/ui.tsx → AppHeader).
              // Android'de yerleşik başlık üstte fazladan boşluk bırakıyordu.
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: COLORS.bg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="review" options={{ gestureEnabled: false }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, backgroundColor: COLORS.bg }} />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
