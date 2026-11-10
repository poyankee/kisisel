# Ders Takip

Özel dersleri, kurum sınıflarını ve kişisel ödemeleri tek yerden takip etmek için telefona ve tablete kurulabilen web uygulaması (PWA). Ayrıntılı plan: [plan.md](plan.md).

## Çalıştırma

```bash
npm install
npm run dev -- --host   # aynı Wi-Fi'deki telefon/tabletten http://<bilgisayar-ip>:5173
npm test
npm run build
```

## Telefona / tablete kurma

Uygulama bir adreste yayınlandıktan sonra:
- **iPhone / iPad (Safari):** Paylaş → *Ana Ekrana Ekle*
- **Android (Chrome):** ⋮ → *Uygulamayı yükle*

## Yayınlama

- **GitHub Pages:** `.github/workflows/deploy.yml` `main` dalına her push'ta yayınlar. Repo ayarlarında *Settings → Pages → Source: GitHub Actions* seçilmeli. (Özel repolarda Pages ücretli plan gerektirebilir.)
- **Vercel / Netlify:** Repoyu bağlamak yeterli; derleme komutu `npm run build`, çıktı klasörü `dist`.

## Veriler

Şu an veriler cihazın tarayıcısında (IndexedDB) saklanır. Telefon–tablet senkronu Supabase ile sonraki adımda gelecek; o zamana kadar **Ayarlar → Yedek al** ile JSON yedeği alınabilir.
