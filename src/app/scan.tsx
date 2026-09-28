import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, Text, View } from 'react-native';

import { Button, FieldLabel, InfoBanner, Screen } from '@/components/ui';
import { getApiKey } from '@/lib/apiKey';
import { readBase64 } from '@/lib/files';
import { analyzeReceipts, GeminiError, type ScanMode, type ScanPart } from '@/lib/gemini';
import { prepareImage } from '@/lib/images';
import { COLORS } from '@/lib/theme';
import { useAppStore } from '@/store/useAppStore';
import { useScanStore, type ScanFile } from '@/store/useScanStore';

const MAX_FILES = 10;

interface PickedFile extends ScanFile {
  key: string;
  /** Resimler eklenirken hazırlanır; PDF'ler analizde okunur */
  base64?: string;
}

const LOADING_MESSAGES = [
  'Fiş okunuyor...',
  'Ürünler ve fiyatlar ayıklanıyor...',
  'Toplam tutar kontrol ediliyor...',
  'Neredeyse bitti...',
];

function ModeCard({
  selected,
  icon,
  title,
  text,
  onPress,
}: {
  selected: boolean;
  icon: 'albums' | 'reader';
  title: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`flex-1 rounded-2xl border p-3 active:opacity-80 ${selected ? 'border-primary bg-primary/10' : 'border-line bg-surface'}`}
    >
      <View className="flex-row items-center justify-between">
        <Ionicons name={icon} size={26} color={selected ? COLORS.primary : COLORS.muted} />
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={selected ? COLORS.primary : COLORS.line}
        />
      </View>
      <Text className="mt-2 text-base font-bold text-ink">{title}</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">{text}</Text>
    </Pressable>
  );
}

export default function Scan() {
  const model = useAppStore((s) => s.geminiModel);
  const setResult = useScanStore((s) => s.setResult);

  const [files, setFiles] = useState<PickedFile[]>([]);
  const [mode, setMode] = useState<ScanMode>('auto');
  const [preparing, setPreparing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasKey, setHasKey] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getApiKey().then((k) => setHasKey(Boolean(k)));
    }, []),
  );

  useEffect(() => {
    if (!analyzing) return;
    const timer = setInterval(() => setMessageIndex((i) => Math.min(i + 1, LOADING_MESSAGES.length - 1)), 5000);
    return () => clearInterval(timer);
  }, [analyzing]);

  const remaining = MAX_FILES - files.length;

  const addImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;
    setPreparing(true);
    try {
      const prepared: PickedFile[] = [];
      for (const asset of assets.slice(0, remaining)) {
        const img = await prepareImage(asset.uri, asset.width);
        prepared.push({ key: `${img.uri}-${prepared.length}`, uri: img.uri, kind: 'image', base64: img.base64 });
      }
      setFiles((prev) => [...prev, ...prepared].slice(0, MAX_FILES));
    } catch {
      Alert.alert('Hata', 'Fotoğraf işlenemedi. Lütfen tekrar deneyin.');
    } finally {
      setPreparing(false);
    }
  };

  const takePhoto = async () => {
    if (remaining <= 0) return Alert.alert('Sınır', `En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera izni gerekli', 'Fiş fotoğrafı çekebilmek için kamera iznini açmanız gerekiyor.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
      if (!result.canceled) await addImages(result.assets);
    } catch {
      Alert.alert('Hata', 'Kamera açılamadı.');
    }
  };

  const pickFromGallery = async () => {
    if (remaining <= 0) return Alert.alert('Sınır', `En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });
      if (!result.canceled) await addImages(result.assets);
    } catch {
      Alert.alert('Hata', 'Galeri açılamadı.');
    }
  };

  const pickPdf = async () => {
    if (remaining <= 0) return Alert.alert('Sınır', `En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const tooBig = result.assets.some((a) => (a.size ?? 0) > 12 * 1024 * 1024);
      if (tooBig) Alert.alert('Dosya çok büyük', '12 MB üzerindeki PDF dosyaları eklenmedi.');
      const picked: PickedFile[] = result.assets
        .filter((a) => (a.size ?? 0) <= 12 * 1024 * 1024)
        .slice(0, remaining)
        .map((a, i) => ({ key: `${a.uri}-${i}`, uri: a.uri, kind: 'pdf', name: a.name }));
      setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    } catch {
      Alert.alert('Hata', 'Dosya seçilemedi.');
    }
  };

  const removeFile = (key: string) => setFiles((prev) => prev.filter((f) => f.key !== key));

  const moveEarlier = (index: number) =>
    setFiles((prev) => {
      if (index <= 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });

  const analyze = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      setHasKey(false);
      Alert.alert('API anahtarı gerekli', 'Fiş okumak için Ayarlar ekranından Gemini API anahtarınızı girin.', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayarlara git', onPress: () => router.navigate('/settings') },
      ]);
      return;
    }

    setMessageIndex(0);
    setAnalyzing(true);
    try {
      const parts: ScanPart[] = [];
      for (const f of files) {
        if (f.kind === 'pdf') parts.push({ base64: await readBase64(f.uri), mimeType: 'application/pdf' });
        else if (f.base64) parts.push({ base64: f.base64, mimeType: 'image/jpeg' });
      }
      const receipts = await analyzeReceipts({ apiKey, model, files: parts, mode });
      if (!receipts.length) {
        Alert.alert(
          'Fiş bulunamadı',
          'Fotoğrafta okunabilir bir fiş bulunamadı. Fişi düz bir yüzeye koyup, iyi ışıkta ve yakından tekrar çekmeyi deneyin.',
        );
        return;
      }
      setResult(
        files.map(({ uri, kind, name }) => ({ uri, kind, name })),
        receipts,
      );
      setAnalyzing(false);
      router.push('/review');
    } catch (e) {
      const message = e instanceof GeminiError ? e.message : 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
      const goSettings = e instanceof GeminiError && (e.kind === 'bad_key' || e.kind === 'model' || e.kind === 'no_key');
      Alert.alert(
        'Okunamadı',
        message,
        goSettings
          ? [
              { text: 'Tamam', style: 'cancel' },
              { text: 'Ayarlara git', onPress: () => router.navigate('/settings') },
            ]
          : undefined,
      );
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <Screen
        title="Fiş Tara"
        footer={
          <Button
            title={files.length ? `Fişi Oku (${files.length} dosya)` : 'Önce fotoğraf ekleyin'}
            icon="sparkles"
            onPress={analyze}
            disabled={!files.length || preparing}
            loading={analyzing}
          />
        }
      >
        {!hasKey ? (
          <InfoBanner tone="warn" icon="key" onPress={() => router.navigate('/settings')}>
            {"Otomatik okuma için Ayarlar'dan Gemini API anahtarı ekleyin."}
          </InfoBanner>
        ) : null}

        <FieldLabel>Ne ekliyorsunuz?</FieldLabel>
        <View className="mb-6 flex-row gap-3">
          <ModeCard
            selected={mode === 'auto'}
            icon="albums"
            title="Ayrı fişler"
            text="Bir veya birden fazla farklı fiş, fatura"
            onPress={() => setMode('auto')}
          />
          <ModeCard
            selected={mode === 'single'}
            icon="reader"
            title="Tek uzun fiş"
            text="Uzun fişi parça parça çektim"
            onPress={() => setMode('single')}
          />
        </View>

        {mode === 'single' ? (
          <InfoBanner icon="bulb">
            Uzun fişi yukarıdan aşağıya doğru, parçalar biraz üst üste gelecek şekilde sırayla çekin. Aynı satırlar iki kez
            sayılmaz.
          </InfoBanner>
        ) : null}

        <View className="gap-3">
          <Button title="Fotoğraf çek" icon="camera" onPress={takePhoto} disabled={preparing || analyzing} />
          <View className="flex-row gap-3">
            <Button
              title="Galeriden"
              icon="images"
              variant="secondary"
              onPress={pickFromGallery}
              disabled={preparing || analyzing}
              className="flex-1"
            />
            <Button
              title="PDF fatura"
              icon="document"
              variant="secondary"
              onPress={pickPdf}
              disabled={preparing || analyzing}
              className="flex-1"
            />
          </View>
        </View>

        {preparing ? (
          <View className="mt-6 flex-row items-center justify-center">
            <ActivityIndicator color={COLORS.primary} />
            <Text className="ml-2 text-base text-muted">Fotoğraf hazırlanıyor...</Text>
          </View>
        ) : null}

        {files.length ? (
          <>
            <View className="mb-3 mt-7 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-ink">Eklenenler</Text>
              <Text className="text-base text-muted">
                {files.length}/{MAX_FILES}
              </Text>
            </View>
            <View className="-mx-1 flex-row flex-wrap">
              {files.map((f, index) => (
                <View key={f.key} className="w-1/3 p-1">
                  <View className="aspect-[3/4] overflow-hidden rounded-2xl border border-line bg-surface2">
                    {f.kind === 'image' ? (
                      <Image source={{ uri: f.uri }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center p-2">
                        <Ionicons name="document-text" size={36} color={COLORS.danger} />
                        <Text className="mt-1 text-center text-xs text-muted" numberOfLines={2}>
                          {f.name ?? 'PDF'}
                        </Text>
                      </View>
                    )}
                    <View className="absolute left-1.5 top-1.5 h-7 min-w-[28px] items-center justify-center rounded-full bg-black/70 px-1">
                      <Text className="text-sm font-bold text-ink">{index + 1}</Text>
                    </View>
                    <Pressable
                      onPress={() => removeFile(f.key)}
                      hitSlop={6}
                      accessibilityLabel={`${index + 1}. dosyayı kaldır`}
                      className="absolute right-1.5 top-1.5 h-8 w-8 items-center justify-center rounded-full bg-black/70 active:opacity-60"
                    >
                      <Ionicons name="close" size={20} color={COLORS.ink} />
                    </Pressable>
                    {index > 0 && mode === 'single' ? (
                      <Pressable
                        onPress={() => moveEarlier(index)}
                        hitSlop={6}
                        accessibilityLabel="Öne al"
                        className="absolute bottom-1.5 left-1.5 h-8 w-8 items-center justify-center rounded-full bg-black/70 active:opacity-60"
                      >
                        <Ionicons name="arrow-back" size={18} color={COLORS.ink} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
            {mode === 'auto' && files.length > 1 ? (
              <Text className="mt-3 text-sm leading-5 text-muted">
                {'Aynı fişin devamı olan fotoğraflar otomatik birleştirilir. Tamamı tek fişse yukarıdan "Tek uzun fiş"i seçin.'}
              </Text>
            ) : null}
          </>
        ) : (
          <View className="mt-8 items-center px-4">
            <Ionicons name="receipt-outline" size={56} color={COLORS.line} />
            <Text className="mt-3 text-center text-base leading-6 text-muted">
              Market, akaryakıt, restoran fişi ya da fatura... Fotoğrafını çekin, tarih, tutar ve ürünler otomatik okunsun.
            </Text>
          </View>
        )}
      </Screen>

      <Modal visible={analyzing} transparent animationType="fade" statusBarTranslucent>
        <View className="flex-1 items-center justify-center bg-black/80 px-8">
          <View className="w-full items-center rounded-3xl bg-surface p-8">
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text className="mt-5 text-center text-xl font-bold text-ink">{LOADING_MESSAGES[messageIndex]}</Text>
            <Text className="mt-2 text-center text-base text-muted">Bu işlem 10-40 saniye sürebilir, lütfen bekleyin.</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}
