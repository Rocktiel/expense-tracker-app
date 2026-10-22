import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/lib/categories';
import { COLORS } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';

const TAB_BAR_HEIGHT = 58;

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={25} color={color as string} />;
  };
}

export default function TabsLayout() {
  const userName = useAppStore((s) => s.userName);
  const insets = useSafeAreaInsets();

  if (!userName) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        // Yüzen ada: içerik tab bar'ın altından geçer, ekranlar alt boşluğu kendisi bırakır
        tabBarStyle: {
          position: 'absolute',
          // Kütüphane tab bar'ı `start`/`end: 0` ile kenarlara yapıştırıyor; bu yüzden
          // left/right yerine mantıksal start/end kullanıyoruz.
          start: 30,
          end: 30,
          bottom: Math.max(insets.bottom, 20) + 6,
          height: TAB_BAR_HEIGHT,
          paddingTop: 8,
          paddingBottom: 0,
          borderRadius: TAB_BAR_HEIGHT / 2,
          borderWidth: 1,
          borderColor: COLORS.line,
          backgroundColor: COLORS.surface,
          elevation: 16,
          shadowColor: '#000000',
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
        },
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="expenses" options={{ title: 'Giderler', tabBarIcon: tabIcon('list', 'list-outline') }} />
      <Tabs.Screen
        name="accounts"
        options={{ title: 'Hesaplar', tabBarIcon: tabIcon('wallet', 'wallet-outline') }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Raporlar', tabBarIcon: tabIcon('pie-chart', 'pie-chart-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Ayarlar', tabBarIcon: tabIcon('settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
