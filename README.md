# Görsel Model Testi

Studio arşivinden dışarı aktarılmış karşılaştırmaları tek bir kör testte sunan bağımsız İngilizce uygulama. Başlığa tıklayınca veya dokununca tam prompt açılır. Katılımcı görsellere 1–5 yıldız verebilir ve testi istediği an bitirebilir. Erken bitirirken kalan görsel sayısı gösterilir. Kişisel sonuçlar verilen puanlarla hesaplanır ve hiç puan verilmediyse oy kaydedilmez. Topluluk sıralaması ana sayfadan da açılır.

## Paketin içeriği

- `public/` herkese gösterilecek sayfa ve WebP görseller
- `data/benchmark.json` promptlar ve sunucuda kalan görsel-model eşleşmeleri
- `api/benchmark.mjs` testleri sunan ve oyları Supabase’e yazan API
- `migrations/20261118_partial_ratings.sql` mevcut oyları koruyarak kısmi puan kaydını açan migration.
- `database.sql` ayrı Supabase tabloları ve kapsamı sınırlı kayıt işlevleri. Studio kaynak reposunda bu dosya `supabase/migrations/0063_public_model_test.sql` olarak durur.

Yayın paketi gerçek test promptlarını ve görselleri içerir. Yayınlamadan önce hedef kitlenle paylaşmak istediğin içerikleri kontrol et. `data/benchmark.json` dosyasını statik web klasörüne koyma.

## Veritabanını bağla

1. `database.sql` dosyası uygulanmadıysa kendi Supabase projenin SQL Editor ekranında çalıştır. Ardından `migrations/20261118_partial_ratings.sql` dosyasını çalıştır. Sonra `migrations/20261118_repeat_attempts.sql` dosyasını çalıştır. Otomatik kayıt zaten kurulmuşsa yalnızca tekrar çözme migration'ı gerekir.
2. `.env.example` dosyasını `.env.local` olarak kopyala. `SUPABASE_URL` ve `SUPABASE_PUBLIC_KEY` alanlarına projenin URL’sini ve publishable veya anon anahtarını gir. `BENCHMARK_ACCESS_KEY` için ayrı, rastgele 32 baytlık hex anahtar kullan. Yeni bir anahtar üretmek gerekirse `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` komutunu kendi bilgisayarında çalıştır.
3. Bu kampanya henüz kaydedilmediyse `npm run db:register` komutunun yazdığı SQL’i aynı editörde çalıştır. Komut anahtarın kendisi yerine özetini verir. Kayıt zaten varsa kampanyaya ait mevcut anahtarı kullan.

Uygulama çalışma zamanında Studio anahtarı, R2 anahtarı veya Supabase service-role anahtarı gerektirmez. `BENCHMARK_ACCESS_KEY` sunucu ortam değişkeni olarak tutulur. Tarayıcıya kampanya anahtarı, ham oy satırları veya özel depolama bağlantıları gönderilmez. Topluluk sıralamasında puan ve katılımcı sayıları gösterilir. Tarayıcıya özel anonim bir çerez, aynı testin aynı tarayıcıdan tekrar sayılmasını önler.

## Vercel'e GitHub üzerinden dağıtım

Bu repo bağımsız yayın paketidir; tek testte 100 prompt ve 472 WebP görsel Git'e dahildir. Mevcut kampanyanın Supabase migration'ı ve kaydı hazırlanmıştır; aynı veritabanı ve kampanya anahtarıyla tekrar kayıt gerekmez.

1. Vercel'de **Add New → Project** üzerinden `craftedanomaly/aiblindtest` reposunu içe aktar.
2. **Root Directory** repo kökü (`./`), **Framework Preset** `Other` olsun. Build Command için override açma; bu uygulama derleme gerektirmez. Output Directory `public` değeri `vercel.json` ile ayarlıdır.
3. **Environment Variables** bölümüne mevcut yerel `.env.local` dosyasındaki `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY` ve `BENCHMARK_ACCESS_KEY` değerlerini ekle. Mevcut kampanya için yeni anahtar üretme. Production ve kullanacaksan Preview ortamlarını seç.
4. **Deploy** ile yayınla. Ana sayfadan **Start test** ve **Community results** düğmelerinin çalıştığını kontrol et. Her yıldız otomatik kaydedilir. Deneme oyları için izole veritabanı kullan.

`.env.local` Git'e dahil değildir. Sunucu `data/benchmark.json` dosyasını okur; `vercel.json` bu dosyayı API işlevine ekler. Dışarıya yalnızca `public/` statik dosyaları açılır. GitHub kaynak reposu herkese açıktır; model eşleşmelerini de içeren kaynak veri burada görülebilir. Kör değerlendirme, web uygulamasının puanlama öncesi yanıtlarında model adlarını gizler.

## Yerel veya diğer sunucularda çalıştırma

- Yerel deneme için Node.js 22 veya üzeriyle paket kökünde `npm start` çalıştır. Adres `http://127.0.0.1:4380`.
- Kontroller için `npm test` çalıştır. Paket üçüncü taraf çalışma zamanı bağımlılığı gerektirmez.
- Başka bir Node.js sunucusunda aynı ortam değişkenleriyle `HOST=0.0.0.0` ve platformun verdiği `PORT` değeri üzerinden `npm start` çalıştır.

İlk yıldızla birlikte katılımcı ve puanı topluluk sonuçlarına dahil edilir. Aynı görselin puanını değiştirmek önceki değeri günceller. Sonuçları açmak testi tamamlar. Bağlantı kesilirse bekleyen puanlar aynı tarayıcı çevrimiçi olduğunda veya siteyi tekrar açtığında gönderilir. Ziyaretçi testi yeniden çözdüğünde önceki turlarda puanlamadığı görselleri görür. Sonuçlar aynı tarayıcıdaki turların tüm puanlarını kapsar. Görsel kalmadığında ana sayfadan kişisel sonuçları açabilir. Kaç kişinin gerçekten katıldığını değerlendirmek için sıralamada görünen örneklem sayısını kullan. Tarayıcı verilerini silen veya tarayıcı değiştiren biri yeni anonim katılımcı olarak görünür.

## Kaynak repodan arşivi yenile

Studio kaynak reposunun kökünde mevcut Supabase ve R2 erişimleriyle `node --env-file-if-exists=.env.local scripts/export-public-model-test.mjs` çalıştır. Birden çok Studio sahibi varsa kaynak sahibi `BENCHMARK_STUDIO_OWNER_ID` ile seçilir. Eski medya dosyalarını tekrar dönüştürmek için `BENCHMARK_REBUILD_MEDIA=1` kullanılabilir. Dışa aktarımdan yalnızca yayınlanacak yeni promptları ve ilgili WebP dosyalarını mevcut birleşik teste ekle. Böylece önceki çıkarmalar ve test kimliği korunur. Studio kaynak reposu bu dosyaları Git dışında tutmaya devam eder.
