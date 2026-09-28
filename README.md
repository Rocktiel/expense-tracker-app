# Gider Defteri 💸

Kişisel gider takip uygulaması. Fişin fotoğrafını çekin, Gemini yapay zekâsı mağazayı, tarihi, tutarı ve ürünleri otomatik okusun. İnternet sunucusu veya veritabanı yok; **tüm veriler sadece telefonda** saklanır.

**Teknolojiler:** Expo SDK 57 · React Native · TypeScript · Expo Router · NativeWind (Tailwind) · Zustand · Gemini API

## Özellikler

- **Otomatik fiş okuma** (Gemini Flash)
  - Kameradan çekme, galeriden çoklu seçim veya **PDF fatura** ekleme
  - **Tek uzun fiş** modu: fişi parça parça çekin, üst üste gelen satırlar iki kez sayılmaz
  - **Ayrı fişler** modu: tek seferde birden çok farklı fiş; aynı fotoğraftaki birden fazla fiş de ayrılır
  - Kaydetmeden önce kontrol ekranı: başlık, tutar, tarih, kategori düzenlenebilir; ürün listesi, kalem toplamı uyarısı
  - **Mükerrer fiş uyarısı** (aynı gün, aynı tutar, benzer mağaza)
- **Elle ekleme**: kredi, fatura, nakit harcama vb. Daha önce girilen başlıklar öneri olarak çıkar (kategorisiyle birlikte)
- **Düzenli ödemeler**: kredi taksidi, kira, faturalar. Ödeme günü yaklaşınca ana sayfada görünür, tek dokunuşla "Ödendi" → gider olarak eklenir
- **Raporlar**: kategori dağılımı, son 6 ay grafiği, en çok harcanan yerler, günlük ortalama
- **Aylık bütçe** ve ana sayfada kalan bütçe göstergesi
- **Arama**: başlık, not ve fişteki ürün adlarında (ör. "ekmek" yazınca o ürünün geçtiği fişler)
- **Excel'e aktar (CSV)**, **yedek al / geri yükle** (JSON)
- Karanlık tema, büyük yazılar ve büyük butonlar (büyüklerin de rahat kullanması için)

## Kurulum

```bash
npm install
npx expo start
```

Telefona **Expo Go** uygulamasını kurun ve terminalde çıkan QR kodu okutun.

## Gemini API anahtarı

1. https://aistudio.google.com/apikey adresinden ücretsiz anahtar alın
2. Uygulamada **Ayarlar → Fiş Okuma (Gemini) → API anahtarı** alanına yapıştırıp **Kaydet ve test et**'e basın

Anahtar telefonun güvenli deposunda (`expo-secure-store`) saklanır. Alternatif olarak proje klasöründe `.env` dosyası oluşturup
`EXPO_PUBLIC_GEMINI_API_KEY=...` yazabilirsiniz (bkz. `.env.example`).

Model varsayılan olarak `gemini-3.8-flash`; Ayarlar'dan değiştirilebilir.

## Kalıcı kurulum (Expo Go olmadan)

Anne-babanın telefonuna normal uygulama gibi kurmak için:

```bash
npx eas-cli@latest build -p android --profile preview
```

(Android için APK üretir. iOS için Apple geliştirici hesabı gerekir.)

APK boyutunu küçük tutmak için `app.json` → `expo-build-properties` ayarlarında sadece `arm64-v8a`
(günümüz telefonlarının tamamı) derlenir, R8 küçültme açıktır ve native kütüphaneler sıkıştırılır.
Çok eski 32-bit bir telefona kurulacaksa `buildArchs` listesine `"armeabi-v7a"` ekleyin.

## Proje yapısı

```
src/
  app/                 Ekranlar (Expo Router)
    (tabs)/            Ana Sayfa, Giderler, Raporlar, Ayarlar
    scan.tsx           Fiş tarama
    review.tsx         Okunan fişleri kontrol & kaydet
    expense/           Gider ekle / detay / düzenle
    recurring.tsx      Düzenli ödemeler
    onboarding.tsx     İlk açılışta isim sorma
  components/          Ortak arayüz bileşenleri
  lib/                 Gemini istemcisi, biçimlendirme, istatistik, dosya işlemleri
  store/               Zustand (AsyncStorage'a kalıcı kayıt)
```

## Komutlar

```bash
npm run typecheck   # TypeScript kontrolü
npm run lint        # ESLint
```
