# Changelog

Çalışma tarihleri Europe/Istanbul saat dilimine göredir. En yeni kayıt üstte yer alır.

## 2026-11-18

### Yayın sonrası sır ve veri erişimi denetimi

- Git geçmişindeki tek commit ve 305 dosya nesnesi, yerel Studio/yayın ortamındaki 15 gerçek yapılandırma değeriyle karşılaştırıldı; eşleşme bulunmadı. Özel anahtar, sağlayıcı token'ı, JWT ve imzalı bağlantı kalıpları taramasında bulgu yoktu. Anahtar değerleri rapora veya Git'e yazılmadı.
- Veri setinde URL, e-posta adresi veya UUID kalıbı bulunmadı; 288 WebP dosyasında EXIF/XMP bölümü yoktu. Bu kontroller, prompt ve görsellerdeki tüm olası kişisel içerik için kapsamlı bir içerik denetimi anlamına gelmez.
- Canlı Supabase'de yalnızca public anahtarla kampanya ve oy tablolarını doğrudan okuma girişimleri 401 döndü. Kampanya anahtarı olmadan veya yanlış anahtarla durum okuma işlevi de 401 döndü. Oy yazılmadı, migration uygulanmadı.
- Herkese açık kaynak reposunda prompt, görsel ve model eşleşmeleri erişilebilirdir. Eşleşmelerin bilinmesi kör değerlendirmeyi etkileyebilir. Anonim çerez farklı tarayıcılar veya otomasyon üzerinden çoklu oyu kesin engellemez.
- Yalnızca denetim kaydı eklendi; uygulama kodu ve dağıtım ayarları değiştirilmedi. Bu denetimde uygulama testleri yeniden çalıştırılmadı. `git diff --check` ve `git diff --cached --check` geçti.

### Bağımsız GitHub ve Vercel yayın paketi

- Studio içindeki `public-model-test` uygulaması `craftedanomaly/aiblindtest` için bağımsız repo köküne alındı. Studio Git geçmişi ve uzak repo ayarı taşınmadı. Uygulama kodu değiştirilmedi.
- Yayının eksiksiz kurulabilmesi için `data/benchmark.json`, 288 WebP görsel ve `database.sql` eklendi. Arşiv 4 test ve 60 prompt içerir. Manifest statik `public/` klasörünün dışında tutulur ve `vercel.json` üzerinden API paketine dahil edilir. Herkese açık GitHub kaynağında model eşleşmeleri görülebilir; web API'si bunları kör değerlendirmede gizler.
- `.gitignore` yerel ortam dosyalarını, Vercel bağlantı bilgilerini ve özel dışa aktarımları hariç tutar. `README.md` GitHub üzerinden Vercel kurulumu, mevcut kampanya anahtarının kullanılması ve arşivi yenileme adımlarını açıklar. Bağımlılıksız paket için `package-lock.json` oluşturuldu.
- Doğrulamalar: `npm test` geçti. 288 dosyanın WebP imzası, manifest eşleşmeleri ve yayın yapılandırması kontrol edildi. Yayın dosyalarında mevcut yerel anahtarların veya imzalı medya URL'lerinin bulunmadığı doğrulandı. Canlı Supabase'e bağlı yerel sunucuda arşiv, kör test yanıtı, görsel erişimi, özel dosyaların 404 dönmesi ve geçersiz puanın reddi kontrol edildi; canlı veritabanına oy yazılmadı.
- İzole PostgreSQL ve Playwright ile masaüstünde hover, mobilde prompt açma, iki ayrı ziyaretçinin oy kaydı, kişisel sonuçları ve ortak ortalamaları doğrulandı. `git diff --cached --check` geçti.
- Mevcut Supabase migration'ı ve kampanya kaydı önceki Studio çalışmasında tamamlanmıştı; bu çalışmada yeni migration uygulanmadı. Vercel bağlantısı, üç sunucu ortam değişkeninin eklenmesi ve dağıtım kullanıcı tarafından yapılacak. Bu çalışmada canlı site dağıtılmadı.
