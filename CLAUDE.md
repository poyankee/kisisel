# Ders Takip — Claude Code notları

- Plan ve kararlar için **plan.md**'ye bak. Her adım sonunda plan.md'deki kutucukları işaretle.
- Arayüz **Türkçe**. Tarih `gg.aa.yyyy`, para ₺, saat dilimi Europe/Istanbul (`src/lib/format.ts`).
- **Mobil öncelikli**: dokunma alanları en az 44 px (`min-h-11`), önemli butonlar alt yarıda. Tablette (md+) sol menü.
- İçe aktarmada **hiçbir şeyi sormadan silme**. Silme yerine arşivleme.
- Kod adlandırması Türkçe (tablolar, alanlar, bileşenler plan.md bölüm 10 ile uyumlu).

## Yapı
- Vite + React + TypeScript + Tailwind v4 + vite-plugin-pwa
- Veri: `src/db.ts` (Dexie / IndexedDB, cihazda). Supabase senkronu ileride bu katmanın arkasına eklenecek; id'ler UUID.
- Yönlendirme: HashRouter (`src/App.tsx`), düzen `src/components/Duzen.tsx`
- Ekranlar `src/pages/`, ortak bileşenler `src/components/ui.tsx`

## Komutlar
- `npm run dev` — geliştirme sunucusu (`--host` ile telefondan aynı ağda açılır)
- `npm test` — vitest
- `npm run build` — tip kontrolü + üretim derlemesi (`BASE_PATH=/kisisel/` alt klasör için)
- `npm run lint` — oxlint
