import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, FieldLabel, InfoBanner, Input, PageTitle, Row, Screen, SectionTitle } from '@/components/ui';
import { getStoredApiKey, hasEnvApiKey, setApiKey } from '@/lib/apiKey';
import { shareCsv, shareJson } from '@/lib/exportData';
import { readTextFile } from '@/lib/files';
import { amountToInput, formatMoney, parseAmount } from '@/lib/format';
import { GEMINI_MODELS, GeminiError, testApiKey } from '@/lib/gemini';
import { COLORS } from '@/lib/theme';
import { isValidBackup, useAppStore } from '@/store/useAppStore';

export default function Settings() {
  const userName = useAppStore((s) => s.userName);
  const setUserName = useAppStore((s) => s.setUserName);
  const budget = useAppStore((s) => s.monthlyBudget);
  const setBudget = useAppStore((s) => s.setMonthlyBudget);
  const model = useAppStore((s) => s.geminiModel);
  const setModel = useAppStore((s) => s.setGeminiModel);
  const expenses = useAppStore((s) => s.expenses);
  const accounts = useAppStore((s) => s.accounts);
  const recurringCount = useAppStore((s) => s.recurring.length);
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const resetAll = useAppStore((s) => s.resetAll);

  const [name, setName] = useState(userName);
  const [budgetText, setBudgetText] = useState(budget ? amountToInput(budget) : '');
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [customModel, setCustomModel] = useState(
    GEMINI_MODELS.some((m) => m.id === model) ? '' : model,
  );

  useEffect(() => {
    getStoredApiKey().then((k) => {
      setSavedKey(k);
      setKey(k ?? '');
    });
  }, []);

  const keyChanged = key.trim() !== (savedKey ?? '');

  const saveKey = async () => {
    const trimmed = key.trim();
    setTesting(true);
    try {
      if (trimmed) await testApiKey(trimmed, model);
      await setApiKey(trimmed);
      setSavedKey(trimmed || null);
      Alert.alert(
        trimmed ? 'Hazır!' : 'Silindi',
        trimmed ? 'API anahtarı çalışıyor ve kaydedildi. Artık fiş tarayabilirsiniz.' : 'API anahtarı kaldırıldı.',
      );
    } catch (e) {
      const message = e instanceof GeminiError ? e.message : 'Anahtar test edilemedi.';
      Alert.alert('Anahtar doğrulanamadı', message, [
        { text: 'Tamam', style: 'cancel' },
        {
          text: 'Yine de kaydet',
          onPress: async () => {
            await setApiKey(trimmed);
            setSavedKey(trimmed || null);
          },
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  const saveBudget = () => {
    const value = parseAmount(budgetText);
    if (!budgetText.trim()) {
      setBudget(null);
    } else if (Number.isFinite(value) && value > 0) {
      setBudget(Math.round(value));
      setBudgetText(amountToInput(Math.round(value)));
    } else {
      Alert.alert('Geçersiz tutar', 'Lütfen bütçeyi rakamla yazın. Örnek: 15000');
    }
  };

  const exportCsv = async () => {
    if (!expenses.length) {
      Alert.alert('Veri yok', 'Dışa aktarılacak harcama bulunmuyor.');
      return;
    }
    try {
      await shareCsv(expenses, accounts);
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Dosya paylaşılamadı.');
    }
  };

  const backup = async () => {
    try {
      const d = new Date();
      await shareJson(
        `gider-defteri-yedek-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`,
        exportBackup(),
      );
    } catch (e) {
      Alert.alert('Hata', e instanceof Error ? e.message : 'Yedek oluşturulamadı.');
    }
  };

  const restore = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const data: unknown = JSON.parse(await readTextFile(result.assets[0].uri));
      if (!isValidBackup(data)) {
        Alert.alert('Geçersiz dosya', 'Bu dosya bir Gider Defteri yedeği değil.');
        return;
      }
      Alert.alert(
        'Yedek geri yüklensin mi?',
        `${data.expenses.length} harcama, ${data.accounts?.length ?? 0} hesap ve ${data.recurring.length} düzenli ödeme yüklenecek. Şu anki verilerin yerini alacak.`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Geri yükle',
            style: 'destructive',
            onPress: () => {
              importBackup(data);
              Alert.alert('Tamamlandı', 'Yedek başarıyla geri yüklendi.');
            },
          },
        ],
      );
    } catch {
      Alert.alert('Hata', 'Dosya okunamadı. Doğru yedek dosyasını seçtiğinizden emin olun.');
    }
  };

  const showKeyHelp = () =>
    Alert.alert(
      'Gemini API anahtarı nasıl alınır?',
      '1. "Google AI Studio\'dan anahtar al" yazısına dokunun\n2. Google hesabınızla giriş yapın\n3. "Create API key" butonuna basın\n4. Oluşan anahtarı kopyalayıp yukarıdaki alana yapıştırın\n5. "Kaydet ve test et" butonuna basın',
    );

  const wipe = () => {
    Alert.alert('Tüm veriler silinsin mi?', 'Bütün harcamalar, hesaplar, gelirler, fiş fotoğrafları ve düzenli ödemeler silinecek (API anahtarı korunur). Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, hepsini sil',
        style: 'destructive',
        // Ad silinince sekme düzeni kendiliğinden karşılama ekranına yönlendirir
        onPress: () => resetAll(),
      },
    ]);
  };

  return (
    <Screen safeTop keyboard>
      <PageTitle title="Ayarlar" />

      <SectionTitle title="Profil" />
      <Card>
        <Input label="Adınız" value={name} onChangeText={setName} autoCapitalize="words" className="mb-3" />
        {name.trim() && name.trim() !== userName ? (
          <Button title="Adı kaydet" small onPress={() => setUserName(name)} />
        ) : null}

        <Input
          label="Aylık bütçe (isteğe bağlı)"
          value={budgetText}
          onChangeText={(t) => setBudgetText(t.replace(/[^\d.,]/g, ''))}
          placeholder="Örn: 20000"
          keyboardType="decimal-pad"
          onBlur={saveBudget}
          onSubmitEditing={saveBudget}
          className="mb-1 mt-2"
        />
        <Text className="text-sm text-muted">
          {budget ? `Şu anki bütçe: ${formatMoney(budget, { decimals: false })}. Silmek için alanı boşaltın.` : 'Bütçe girerseniz ana sayfada ne kadar kaldığını görürsünüz.'}
        </Text>
      </Card>

      <SectionTitle title="Fiş Okuma (Gemini)" />
      <Card>
        {!savedKey && !hasEnvApiKey() ? (
          <InfoBanner tone="warn" icon="key">
            Fişlerin otomatik okunması için ücretsiz bir Gemini API anahtarı gerekir.
          </InfoBanner>
        ) : null}
        <FieldLabel>API anahtarı</FieldLabel>
        <View className="mb-3 min-h-[56px] flex-row items-center rounded-2xl border border-line bg-surface2 px-4">
          <TextInput
            value={key}
            onChangeText={setKey}
            placeholder={hasEnvApiKey() ? '.env dosyasındaki anahtar kullanılıyor' : 'AIza...'}
            placeholderTextColor={COLORS.faint}
            selectionColor={COLORS.primary}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 py-3 text-lg text-ink"
          />
          <Pressable onPress={() => setShowKey(!showKey)} hitSlop={10} accessibilityLabel="Anahtarı göster/gizle">
            <Ionicons name={showKey ? 'eye-off' : 'eye'} size={22} color={COLORS.muted} />
          </Pressable>
        </View>
        {keyChanged ? (
          <Button title={key.trim() ? 'Kaydet ve test et' : 'Anahtarı kaldır'} small loading={testing} onPress={saveKey} />
        ) : savedKey ? (
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text className="ml-2 text-base text-primary">Anahtar kayıtlı</Text>
          </View>
        ) : null}
        <Pressable
          onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}
          className="mt-4 flex-row items-center active:opacity-60"
        >
          <Ionicons name="open-outline" size={18} color={COLORS.info} />
          <Text className="ml-2 text-base font-semibold text-info">{"Google AI Studio'dan anahtar al"}</Text>
        </Pressable>

        <Pressable onPress={showKeyHelp} className="mt-3 flex-row items-center active:opacity-60">
          <Ionicons name="help-circle-outline" size={18} color={COLORS.info} />
          <Text className="ml-2 text-base font-semibold text-info">Anahtar nasıl alınır?</Text>
        </Pressable>

        <View className="mt-6">
          <FieldLabel>Model</FieldLabel>
        </View>
        {GEMINI_MODELS.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              setModel(m.id);
              setCustomModel('');
            }}
            className={`mb-2 flex-row items-center rounded-2xl border p-3 active:opacity-70 ${model === m.id ? 'border-primary bg-primary/10' : 'border-line bg-surface2'}`}
          >
            <Ionicons
              name={model === m.id ? 'radio-button-on' : 'radio-button-off'}
              size={22}
              color={model === m.id ? COLORS.primary : COLORS.muted}
            />
            <View className="ml-3 flex-1">
              <Text className="text-base font-semibold text-ink">{m.label}</Text>
              <Text className="text-sm text-muted">{m.description}</Text>
            </View>
          </Pressable>
        ))}
        <Input
          label="veya model adını yazın"
          value={customModel}
          onChangeText={setCustomModel}
          onBlur={() => {
            if (customModel.trim()) setModel(customModel.trim());
          }}
          placeholder="örn. gemini-3.8-flash"
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-0 mt-2"
        />
      </Card>

      <SectionTitle title="Hesaplar" />
      <Card className="py-1">
        <Row
          icon="wallet"
          title="Banka, nakit, kart hesapları"
          value={accounts.length ? `${accounts.length} hesap` : undefined}
          onPress={() => router.push('/accounts')}
        />
      </Card>

      <SectionTitle title="Düzenli Ödemeler" />
      <Card className="py-1">
        <Row
          icon="repeat"
          title="Kredi, fatura, kira..."
          value={recurringCount ? `${recurringCount} kayıt` : undefined}
          onPress={() => router.push('/recurring')}
        />
      </Card>

      <SectionTitle title="Veriler" />
      <Card className="py-1">
        <Row icon="document-text" title="Excel'e aktar (CSV)" onPress={exportCsv} />
        <Row icon="cloud-upload" title="Yedek al" onPress={backup} />
        <Row icon="cloud-download" title="Yedekten geri yükle" onPress={restore} />
        <Row icon="trash" title="Tüm verileri sil" danger onPress={wipe} />
      </Card>
      <Text className="mt-3 text-sm leading-5 text-faint">
        {'Tüm veriler sadece bu telefonda saklanır. Telefon değiştirmeden önce "Yedek al" ile dosyayı kaydedin (fiş fotoğrafları yedeğe dahil değildir).'}
      </Text>

    </Screen>
  );
}
