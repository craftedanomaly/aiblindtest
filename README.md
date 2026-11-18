# Görsel Model Testi

Studio arşivinden dışarı aktarılmış karşılaştırmalar için bağımsız Türkçe uygulama. Görseller kör sırada gösterilir. Başlık üstüne gelince veya başlığa dokununca tam prompt açılır. Katılımcı her görsele 1–5 yıldız verebilir. Bir test tamamlandığında modeller, kişisel sıralama ve topluluk sıralaması görünür.

## Paketin içeriği

- `public/` herkese gösterilecek sayfa ve WebP görseller
- `data/benchmark.json` promptlar ve sunucuda kalan görsel-model eşleşmeleri
- `api/benchmark.mjs` testleri sunan ve oyları Supabase’e yazan API
- `database.sql` ayrı Supabase tabloları ve kapsamı sınırlı kayıt işlevleri. Studio kaynak reposunda bu dosya `supabase/migrations/0063_public_model_test.sql` olarak durur.

Yayın paketi gerçek test promptlarını ve görselleri içerir. Yayınlamadan önce hedef kitlenle paylaşmak istediğin içerikleri kontrol et. `data/benchmark.json` dosyasını statik web klasörüne koyma.

## Veritabanını bağla

1. `database.sql` dosyası uygulanmadıysa kendi Supabase projenin SQL Editor ekranında çalıştır.
2. `.env.example` dosyasını `.env.local` olarak kopyala. `SUPABASE_URL` ve `SUPABASE_PUBLIC_KEY` alanlarına projenin URL’sini ve publishable veya anon anahtarını gir. `BENCHMARK_ACCESS_KEY` için ayrı, rastgele 32 baytlık hex anahtar kullan. Yeni bir anahtar üretmek gerekirse `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` komutunu kendi bilgisayarında çalıştır.
3. Bu kampanya henüz kaydedilmediyse `npm run db:register` komutunun yazdığı SQL’i aynı editörde çalıştır. Komut anahtarın kendisi yerine özetini verir. Kayıt zaten varsa kampanyaya ait mevcut anahtarı kullan.

Uygulama çalışma zamanında Studio anahtarı, R2 anahtarı veya Supabase service-role anahtarı gerektirmez. `BENCHMARK_ACCESS_KEY` sunucu ortam değişkeni olarak tutulur. Tarayıcıya kampanya anahtarı, ham oy satırları veya özel depolama bağlantıları gönderilmez. Topluluk sıralamasında puan ve katılımcı sayıları gösterilir. Tarayıcıya özel anonim bir çerez, aynı testin aynı tarayıcıdan tekrar sayılmasını önler.

## Vercel'e GitHub üzerinden dağıtım

Bu repo bağımsız yayın paketidir; 4 test, 60 prompt ve 288 WebP görsel Git'e dahildir. Mevcut kampanyanın Supabase migration'ı ve kaydı hazırlanmıştır; aynı veritabanı ve kampanya anahtarıyla tekrar kayıt gerekmez.

1. Vercel'de **Add New → Project** üzerinden `craftedanomaly/aiblindtest` reposunu içe aktar.
2. **Root Directory** repo kökü (`./`), **Framework Preset** `Other` olsun. Build Command için override açma; bu uygulama derleme gerektirmez. Output Directory `public` değeri `vercel.json` ile ayarlıdır.
3. **Environment Variables** bölümüne mevcut yerel `.env.local` dosyasındaki `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY` ve `BENCHMARK_ACCESS_KEY` değerlerini ekle. Mevcut kampanya için yeni anahtar üretme. Production ve kullanacaksan Preview ortamlarını seç.
4. **Deploy** ile yayınla. Ana sayfada 4 testin görünmesini, bir testin ve görselin açılmasını kontrol et. Gerçek değerlendirme yapmak istemiyorsan test sonunda oy gönderme.

`.env.local` Git'e dahil değildir. Sunucu `data/benchmark.json` dosyasını okur; `vercel.json` bu dosyayı API işlevine ekler. Dışarıya yalnızca `public/` statik dosyaları açılır. GitHub kaynak reposu herkese açıktır; model eşleşmelerini de içeren kaynak veri burada görülebilir. Kör değerlendirme, web uygulamasının puanlama öncesi yanıtlarında model adlarını gizler.

## Yerel veya diğer sunucularda çalıştırma

- Yerel deneme için Node.js 22 veya üzeriyle paket kökünde `npm start` çalıştır. Adres `http://127.0.0.1:4380`.
- Kontroller için `npm test` çalıştır. Paket üçüncü taraf çalışma zamanı bağımlılığı gerektirmez.
- Başka bir Node.js sunucusunda aynı ortam değişkenleriyle `HOST=0.0.0.0` ve platformun verdiği `PORT` değeri üzerinden `npm start` çalıştır.

Oy ortalamaları yıldız verilen görseller üzerinden hesaplanır. Ziyaretçi tamamladığı testi yeniden açtığında kendi kaydını görür. Kaç kişinin gerçekten katıldığını değerlendirmek için sıralamada görünen örneklem sayısını kullan. Tarayıcı verilerini silen veya tarayıcı değiştiren biri yeni anonim katılımcı olarak görünür.

## Kaynak repodan arşivi yenile

Studio kaynak reposunun kökünde mevcut Supabase ve R2 erişimleriyle `node --env-file-if-exists=.env.local scripts/export-public-model-test.mjs` çalıştır. Birden çok Studio sahibi varsa kaynak sahibi `BENCHMARK_STUDIO_OWNER_ID` ile seçilir. Eski medya dosyalarını tekrar dönüştürmek için `BENCHMARK_REBUILD_MEDIA=1` kullanılabilir. Oluşan `data/benchmark.json` ve `public/media/` dosyalarını bu bağımsız repoya kopyala, kontrollerden sonra commit edip pushla. Studio kaynak reposu bu dosyaları Git dışında tutmaya devam eder.
