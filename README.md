# Ders Takip

Özel dersleri, kurum sınıflarını ve kişisel ödemeleri tek yerden takip etmek için Android uygulaması (React + Capacitor). Ayrıntılı plan: [plan.md](plan.md).

## APK'yı indirme ve kurma

Her push'ta GitHub Actions APK derler:
1. Telefondan reponun **Releases → "Ders Takip — son sürüm"** sayfasını aç, `DersTakip.apk` dosyasını indir.
2. Açınca Android "bilinmeyen kaynak" izni ister: tarayıcıya (ya da Dosyalar'a) izin ver.
3. Yükle.

> **Güncellemelerde dikkat:** Sabit bir imza anahtarı tanımlanmadıysa her derleme farklı anahtarla imzalanır ve yeni APK eskisinin üzerine kurulamaz (önce kaldırmak gerekir, bu da verileri siler). Kaldırmadan önce **Ayarlar → Yedek al**, kurduktan sonra **Yedek yükle**.

### Sabit imza anahtarı (bir kerelik, isteğe bağlı)

Kendi bilgisayarında Java'nın `keytool` aracıyla bir anahtar dosyası oluştur, sonra GitHub'da
**Settings → Secrets and variables → Actions** altında şu gizli değerleri ekle:

| Secret | İçerik |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Anahtar dosyasının base64 hali |
| `ANDROID_KEYSTORE_PASSWORD` | Anahtar deposu şifresi |
| `ANDROID_KEY_ALIAS` | Anahtar adı |
| `ANDROID_KEY_PASSWORD` | Anahtar şifresi |

Anahtar dosyasını ve şifreleri **asla repoya koyma**. Bu adımdan sonraki ilk APK'yı kurmadan önce eskisini kaldırman gerekir (yedek alarak); ondan sonra güncellemeler üzerine kurulur.

## Geliştirme

```bash
npm install
npm run dev -- --host     # tarayıcıda dene
npm test                  # ayrıştırıcı ve içe aktarma testleri
npm run build:android     # web derlemesi + Capacitor senkronu (android/)
cd android && ./gradlew assembleDebug   # Android SDK gerekir
```

## Veriler

Veriler telefonda (uygulamanın içinde, IndexedDB) saklanır. Uygulama silinirse veriler de silinir; **Ayarlar → Yedek al** ile JSON yedeği Drive'a ya da WhatsApp'a gönderilebilir, **Yedek yükle** ile geri alınır.
