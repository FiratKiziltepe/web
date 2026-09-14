# Vercel'e yayımlama (tek komut)

Bu klasör hazır bir statik web projesidir; derleme (build) gerektirmez.

## Seçenek 1 — Vercel CLI (en hızlı)

Bilgisayarınızda Node.js kuruluysa, bu klasörde bir terminal açıp:

```
npx vercel deploy --prod --yes --token BURAYA_TOKEN
```

İlk çalıştırmada proje adı sorulmaz (`--yes`), doğrudan yayımlanır ve
terminalde `https://...vercel.app` adresi görünür.

Node.js kurulu değilse: https://nodejs.org (LTS) kurulumu yeterlidir.

## Seçenek 2 — Vercel paneli (GitHub üzerinden)

1. Bu klasörü bir GitHub deposuna yükleyin.
2. vercel.com → Add New… → Project → depoyu seçin → Deploy.
3. Ayar değiştirmeye gerek yok; `vercel.json` çıktının `public` klasörü
   olduğunu zaten belirtiyor.

## Klasör içeriği

- `public/index.html` — arayüz
- `public/app.js` — yükleme, filtreleme, Excel çıktısı
- `public/parser.js` — PDF çözümleme mantığı
- `public/vendor/` — pdf.js ve ExcelJS (çevrim dışı çalışır, CDN gerekmez)
- `vercel.json` — statik yayım ayarı
