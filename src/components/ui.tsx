import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconName } from '@/lib/categories';
import { COLORS } from '@/lib/theme';

/* ------------------------------------------------------------------ */
/* Ekran iskeleti                                                      */
/* ------------------------------------------------------------------ */

interface ScreenProps {
  children: ReactNode;
  /** Sekme ekranları: başlık çubuğu yok, çentik boşluğunu içerik alır */
  safeTop?: boolean;
  /** Verilirse üstte geri butonlu başlık çubuğu gösterilir */
  title?: string;
  /** Geri butonuna basınca ne olacağı; varsayılan bir önceki sayfaya dönmek */
  onBack?: () => void;
  scroll?: boolean;
  /** Alt kısma sabitlenen alan (ör. Kaydet butonu) */
  footer?: ReactNode;
  keyboard?: boolean;
}

/**
 * Geri butonlu sayfaların başlığı. Yerleşik navigasyon başlığı yerine bunu kullanıyoruz;
 * Android'de (edge-to-edge) yerleşik başlık gereksiz yüksek boşluk bırakıyordu.
 */
export function AppHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View className="flex-row items-center bg-bg px-2" style={{ paddingTop: insets.top, height: insets.top + 56 }}>
      <Pressable
        onPress={goBack}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Geri"
        className="h-12 w-12 items-center justify-center rounded-full active:bg-surface2"
      >
        <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={26} color={COLORS.ink} />
      </Pressable>
      <Text className="ml-1 flex-1 text-xl font-bold text-ink" numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

export function Screen({ children, safeTop = false, title, onBack, scroll = true, footer, keyboard = false }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const topPadding = title ? 8 : safeTop ? insets.top + 12 : 16;
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: topPadding,
        paddingBottom: footer ? 24 : insets.bottom + 32,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-4" style={{ paddingTop: topPadding }}>
      {children}
    </View>
  );

  const body = (
    <>
      {title ? <AppHeader title={title} onBack={onBack} /> : null}
      {content}
      {footer ? (
        <View className="border-t border-line bg-bg px-4 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    <View className="flex-1 bg-bg">
      {keyboard ? (
        // Başlık KeyboardAvoidingView'in içinde olduğundan ek ofset gerekmiyor
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Yazı                                                                 */
/* ------------------------------------------------------------------ */

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-5">
      <Text className="text-3xl font-bold text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-base text-muted">{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="mb-3 mt-7 flex-row items-center justify-between">
      <Text className="text-xl font-bold text-ink">{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} className="active:opacity-60">
          <Text className="text-base font-semibold text-primary">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Kart                                                                 */
/* ------------------------------------------------------------------ */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-3xl border border-line bg-surface p-4 ${className}`}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Butonlar                                                             */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonStyles: Record<ButtonVariant, { box: string; text: string; icon: string }> = {
  primary: { box: 'bg-primary', text: 'text-onprimary', icon: COLORS.onprimary },
  secondary: { box: 'bg-surface2 border border-line', text: 'text-ink', icon: COLORS.ink },
  danger: { box: 'bg-danger/15 border border-danger/40', text: 'text-danger', icon: COLORS.danger },
  ghost: { box: 'bg-transparent', text: 'text-primary', icon: COLORS.primary },
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  small = false,
  className = '',
}: ButtonProps) {
  const s = buttonStyles[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`flex-row items-center justify-center rounded-2xl active:opacity-75 ${small ? 'min-h-[46px] px-4' : 'min-h-[58px] px-5'} ${s.box} ${inactive ? 'opacity-50' : ''} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={s.icon} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 20 : 24} color={s.icon} style={{ marginRight: 8 }} /> : null}
          <Text className={`${small ? 'text-base' : 'text-lg'} font-bold ${s.text}`}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Ana sayfadaki büyük eylem kutuları */
export function BigAction({
  title,
  subtitle,
  icon,
  onPress,
  accent = false,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      className={`flex-1 rounded-3xl p-4 active:opacity-80 ${accent ? 'bg-primary' : 'border border-line bg-surface2'}`}
    >
      <View
        className={`mb-3 h-14 w-14 items-center justify-center rounded-2xl ${accent ? 'bg-onprimary/15' : 'bg-primary/15'}`}
      >
        <Ionicons name={icon} size={30} color={accent ? COLORS.onprimary : COLORS.primary} />
      </View>
      <Text className={`text-xl font-bold ${accent ? 'text-onprimary' : 'text-ink'}`}>{title}</Text>
      <Text className={`mt-1 text-sm ${accent ? 'text-onprimary/80' : 'text-muted'}`}>{subtitle}</Text>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = COLORS.ink,
  size = 24,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-11 w-11 items-center justify-center rounded-full bg-surface2 active:opacity-60"
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Seçim çipleri                                                        */
/* ------------------------------------------------------------------ */

export function Chip({
  label,
  selected,
  onPress,
  icon,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`mb-2 mr-2 min-h-[44px] flex-row items-center rounded-full border px-4 active:opacity-70 ${selected ? 'border-primary bg-primary/15' : 'border-line bg-surface2'}`}
    >
      {icon ? (
        <Ionicons name={icon} size={18} color={selected ? COLORS.primary : (color ?? COLORS.muted)} style={{ marginRight: 6 }} />
      ) : null}
      <Text className={`text-base font-semibold ${selected ? 'text-primary' : 'text-ink'}`}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Form alanları                                                        */
/* ------------------------------------------------------------------ */

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className="mb-2 text-base font-semibold text-muted">{children}</Text>;
}

export function Input({ label, className = '', ...props }: TextInputProps & { label?: string; className?: string }) {
  return (
    <View className={`mb-5 ${className}`}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <TextInput
        placeholderTextColor={COLORS.faint}
        selectionColor={COLORS.primary}
        className="min-h-[56px] rounded-2xl border border-line bg-surface2 px-4 text-lg text-ink"
        {...props}
      />
    </View>
  );
}

/** Büyük tutar alanı */
export function AmountInput({
  value,
  onChangeText,
  autoFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <View className="mb-5">
      <FieldLabel>Tutar</FieldLabel>
      <View className="min-h-[76px] flex-row items-center rounded-2xl border border-line bg-surface2 px-4">
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^\d.,]/g, ''))}
          placeholder="0,00"
          placeholderTextColor={COLORS.faint}
          selectionColor={COLORS.primary}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          accessibilityLabel="Tutar"
          className="flex-1 py-3 text-4xl font-bold text-ink"
        />
        <Text className="ml-2 text-3xl font-bold text-muted">₺</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Diğer                                                                */
/* ------------------------------------------------------------------ */

export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View className="h-3 overflow-hidden rounded-full bg-surface2">
      <View style={{ width: `${pct * 100}%`, backgroundColor: color ?? COLORS.primary }} className="h-full rounded-full" />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  children,
}: {
  icon: IconName;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-line px-6 py-10">
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface2">
        <Ionicons name={icon} size={32} color={COLORS.muted} />
      </View>
      <Text className="text-center text-xl font-bold text-ink">{title}</Text>
      {message ? <Text className="mt-2 text-center text-base leading-6 text-muted">{message}</Text> : null}
      {children ? <View className="mt-5 w-full">{children}</View> : null}
    </View>
  );
}

export function InfoBanner({
  icon = 'information-circle',
  tone = 'info',
  children,
  onPress,
}: {
  icon?: IconName;
  tone?: 'info' | 'warn' | 'danger';
  children: ReactNode;
  onPress?: () => void;
}) {
  const color = tone === 'warn' ? COLORS.warn : tone === 'danger' ? COLORS.danger : COLORS.info;
  const box =
    tone === 'warn'
      ? 'border-warn/40 bg-warn/10'
      : tone === 'danger'
        ? 'border-danger/40 bg-danger/10'
        : 'border-info/40 bg-info/10';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className={`mb-4 flex-row items-start rounded-2xl border p-4 active:opacity-80 ${box}`}
    >
      <Ionicons name={icon} size={24} color={color} style={{ marginRight: 10, marginTop: 1 }} />
      <View className="flex-1">
        {typeof children === 'string' ? <Text className="text-base leading-6 text-ink">{children}</Text> : children}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={color} style={{ marginLeft: 6, marginTop: 2 }} /> : null}
    </Pressable>
  );
}

export function Row({
  icon,
  title,
  value,
  onPress,
  danger = false,
}: {
  icon: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="min-h-[60px] flex-row items-center border-b border-line px-1 py-3 active:opacity-60"
    >
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${danger ? 'bg-danger/15' : 'bg-surface2'}`}>
        <Ionicons name={icon} size={22} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text className={`flex-1 text-lg ${danger ? 'text-danger' : 'text-ink'}`}>{title}</Text>
      {value ? (
        <Text className="ml-2 max-w-[45%] text-base text-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={20} color={COLORS.faint} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}
