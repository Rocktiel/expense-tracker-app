import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/lib/categories';
import { COLORS } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';

function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={26} color={color as string} />;
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
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: tabIcon('home', 'home-outline') }} />
      <Tabs.Screen name="expenses" options={{ title: 'Giderler', tabBarIcon: tabIcon('list', 'list-outline') }} />
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
