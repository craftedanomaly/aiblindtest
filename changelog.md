# Changelog

Çalışma tarihleri Europe/Istanbul saat dilimine göredir. En yeni kayıt üstte yer alır.

## 2026-11-18

### Bağımsız GitHub ve Vercel yayın paketi

- Studio içindeki `public-model-test` uygulaması `craftedanomaly/aiblindtest` için bağımsız repo köküne alındı. Studio Git geçmişi ve uzak repo ayarı taşınmadı. Uygulama kodu değiştirilmedi.
- Yayının eksiksiz kurulabilmesi için `data/benchmark.json`, 288 WebP görsel ve `database.sql` eklendi. Arşiv 4 test ve 60 prompt içerir. Manifest statik `public/` klasörünün dışında tutulur ve `vercel.json` üzerinden API paketine dahil edilir. Herkese açık GitHub kaynağında model eşleşmeleri görülebilir; web API'si bunları kör değerlendirmede gizler.
- `.gitignore` yerel ortam dosyalarını, Vercel bağlantı bilgilerini ve özel dışa aktarımları hariç tutar. `README.md` GitHub üzerinden Vercel kurulumu, mevcut kampanya anahtarının kullanılması ve arşivi yenileme adımlarını açıklar. Bağımlılıksız paket için `package-lock.json` oluşturuldu.
- Doğrulamalar: `npm test` geçti. 288 dosyanın WebP imzası, manifest eşleşmeleri ve yayın yapılandırması kontrol edildi. Yayın dosyalarında mevcut yerel anahtarların veya imzalı medya URL'lerinin bulunmadığı doğrulandı. Canlı Supabase'e bağlı yerel sunucuda arşiv, kör test yanıtı, görsel erişimi, özel dosyaların 404 dönmesi ve geçersiz puanın reddi kontrol edildi; canlı veritabanına oy yazılmadı.
- İzole PostgreSQL ve Playwright ile masaüstünde hover, mobilde prompt açma, iki ayrı ziyaretçinin oy kaydı, kişisel sonuçları ve ortak ortalamaları doğrulandı. `git diff --cached --check` geçti.
- Mevcut Supabase migration'ı ve kampanya kaydı önceki Studio çalışmasında tamamlanmıştı; bu çalışmada yeni migration uygulanmadı. Vercel bağlantısı, üç sunucu ortam değişkeninin eklenmesi ve dağıtım kullanıcı tarafından yapılacak. Bu çalışmada canlı site dağıtılmadı.
