# Öğretim Programı Veri Çıkarma Aracı

MEB öğretim programı PDF dosyalarından öğrenme çıktılarını, süreç bileşenlerini ve öğrenme-öğretme uygulamalarını çıkarıp tablo ve Excel çıktısı üreten, tamamen tarayıcıda çalışan statik web uygulaması.

- `public/` — yayımlanan statik site (PDF işleme pdf.js ile tarayıcıda yapılır)
- `public/parser.js` — program ayrıştırma mantığı
- `tools/` — Node ile doğrulama betikleri (yayımlanmaz)

## Ayrıştırıcı doğrulaması

`web` klasöründen çalıştırın:

```sh
node tools/extract.mjs
node tools/parser.test.mjs
```

İlk komut üst klasördeki örnek PDF dosyalarını, tarayıcıdakiyle aynı pdf.js sürümüyle okur. İkinci komut müzik (108), fen (182) ve hayat bilgisi (66) kayıtlarını; kod yazım farklılıklarını, aynı satırdaki başlıkları, sayfa devamlarını ve bölüm sınırlarını doğrular. `tools/cache/` yerel test verisidir, yayımlanmaz.

PDF metni tarayıcıda işlenir; veritabanı veya sunucuya dosya yükleme gerekmez. Görüntü tabanlı PDF'ler için OCR desteği yoktur. Farklı program düzenlerinde bulunan eksik eşleşmeler kullanıcıya uyarı olarak gösterilir; her PDF düzeni için hatasız çıkarım garantisi verilmez.

## Canlı adresler ve GitHub yedeği

- GitHub Pages: https://firatkiziltepe.github.io/web/
- Vercel: https://web-three-jet-43.vercel.app/
- Kaynak kod: https://github.com/FiratKiziltepe/web

`main` kaynak kodunu, `gh-pages` yalnızca `public/` klasöründeki yayımlanabilir dosyaları tutar. Güncellemeler kaydedildikten sonra iki dalı eşitlemek için:

```sh
git push origin main
git subtree push --prefix public origin gh-pages
```

GitHub Pages, `gh-pages` dalının kök dizininden yayın yapar. Vercel `public/` klasörünü kullanmaya devam eder. Örnek PDF/Excel dosyaları, yerel test önbelleği ve hesap ayarları kaynak deposuna dahil edilmez.
