# Ders Takip — Claude Code notları

- Plan ve kararlar için **plan.md**'ye bak. Her adım sonunda plan.md'deki kutucukları işaretle.
- Arayüz **Türkçe**. Tarih `gg.aa.yyyy`, para ₺, saat dilimi Europe/Istanbul (`src/lib/format.ts`).
- **Mobil öncelikli**: dokunma alanları en az 44 px (`min-h-11`), önemli butonlar alt yarıda. Tablette (md+) sol menü.
- İçe aktarmada **hiçbir şeyi sormadan silme**. Silme yerine arşivleme.
- Kod adlandırması Türkçe (tablolar, alanlar, bileşenler plan.md bölüm 10 ile uyumlu).

## Yapı
- Hedef: **Android APK** (Capacitor, `android/`). Web derlemesi de çalışır ama şu an öncelik değil.
- Vite + React + TypeScript + Tailwind v4 (+ vite-plugin-pwa, Android derlemesinde kapalı)
- Android'e özgü işler `src/lib/native.ts` (geri tuşu, dosya paylaşma). Tarayıcı indirmesi APK'da çalışmaz.
- APK GitHub Actions'ta derlenir (`.github/workflows/android.yml`) ve "son-surum" yayınına konur. İmza anahtarı repoya konmaz, sadece GitHub secret.
- Kurum programı: `src/lib/programAyristir.ts` (ayrıştırıcı), `src/lib/iceAktarma.ts` (planla / uygula / geri al), ekran `src/pages/ProgramYukle.tsx`
- Veri: `src/db.ts` (Dexie / IndexedDB, cihazda). Supabase senkronu ileride bu katmanın arkasına eklenecek; id'ler UUID.
- Yönlendirme: HashRouter (`src/App.tsx`), düzen `src/components/Duzen.tsx`
- Ekranlar `src/pages/`, ortak bileşenler `src/components/ui.tsx`

## Komutlar
- `npm run dev` — geliştirme sunucusu (`--host` ile telefondan aynı ağda açılır)
- `npm test` — vitest
- `npm run build` — tip kontrolü + web derlemesi
- `npm run build:android` — Android için derle + `cap sync android`
- `npm run lint` — oxlint
