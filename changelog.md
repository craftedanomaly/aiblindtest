# Changelog

Çalışma tarihleri Europe/Istanbul saat dilimine göredir. En yeni kayıt üstte yer alır.

## 2026-11-18

### Puanlama ekranında araç çubuklarının hizalanması

- `public/app.js` önceki prompt düğmesini başlığın yanına, yalnızca görsel düğmesini kapatma düğmesinin yanına alır. Puanlanan görsel sayısı küçük resimlerin yanında durur. Sonraki prompt ve testi bitirme düğmeleri alt çubuğun iki ucundadır.
- `public/styles.css` üst ve alt çubuklara aynı yatay hizayı verir. Küçük resimler, sayaç ve yıldızlar masaüstünde tek satırda bir araya gelir. Dar ekranda iki kısa satıra ayrılırlar. Yalnızca görsel modunda sadece görüntüye dönme düğmesi görünür.
- `npm test`, JavaScript sözdizimi, Impeccable taraması ve `git diff --check` geçti. Playwright ile 320–1917 px arasında altı ekran boyutunda hizalama ve taşma kontrol edildi. Prompt açma, görüntü modu ve otomatik puanlama geçişi doğrulandı. Canlı veritabanına oy yazılmadı. Migration gerekmiyor.

### Yıldız verdikten sonra otomatik ilerleme

- `public/app.js`, yıldız verildiğinde sıradaki puanlanmamış görseli seçer ve seçili küçük görseli görünür tutar. Prompt tamamlanınca bir sonraki prompt açılır. Tamamlanmış bir promptta eski puanı değiştirmek promptu atlamaz. Son promptta kullanıcı sonuçlar düğmesine kendisi basar.
- `npm test`, JavaScript sözdizimi ve `git diff --check` geçti. Playwright ile fare, dokunmatik ve klavye puanlaması, puanlanan görselleri atlama, başa dönüp kalan görseli seçme, otomatik prompt geçişi ve son promptta gönderim yapılmaması doğrulandı. Migration gerekmiyor.

### Test için klavye kısayolları

- `public/app.js` puanlama ekranında Space ile sonraki prompta, sol ve sağ oklarla aynı prompttaki önceki veya sonraki görsele geçiş ekler. Space basılı tutulduğunda birden fazla prompt atlanmaz ve son promptta oy gönderilmez. Klavyeyle odaklanılan düğmeler, yıldızlar ve prompt metni kendi tuş davranışını korur.
- `npm test`, JavaScript sözdizimi ve `git diff --check` geçti. Playwright ile geçişler, ilk ve son görsel sınırları, küçük görsel odağı, yıldızların fare ve klavyeyle kullanımı, onay penceresi ve son prompt davranışı doğrulandı. Canlıya oy yazılmadı. Migration gerekmiyor.

### Yeni testlerde rastgele prompt sırası

- `public/app.js`, her yeni denemede 100 promptun sırasını karıştırır. Bir deneme yarıda bırakılırsa prompt sırası, geçerli prompt ve puanlar tarayıcı taslağından geri yüklenir. Eski taslaklar kaldığı prompttan açılır. Görsellerin prompt içindeki karışımı devam eder.
- `npm test`, JavaScript sözdizimi ve `git diff --check` geçti. Playwright ile iki yeni denemenin farklı sıralar aldığı, her promptun tek kez yer aldığı ve yenileme sonrası sıranın, geçerli promptun ve puanın korunduğu doğrulandı. Eski ve eksik sıralı taslaklar denendi. Canlıya oy yazılmadı. Migration gerekmiyor.

### 42 Studio promptu, daha geniş görsel alanı ve dokunmatik yakınlaştırma

- Studio'daki yeni 42 prompt ve başarıyla üretilen 194 WebP görsel mevcut testin sonuna eklendi. Başarısız 16 üretimden görsel alınmadı. Tek test artık 100 prompt ve 472 görsel içeriyor. İlk 58 prompt, görsel eşleşmeleri, test ve kampanya kimlikleri korundu.
- `public/styles.css` ana sayfadaki metin ve düğme grubunu 1440 px genişlikte yaklaşık 61 px daha sağa alır. Puanlama ekranında başlık ve alt kontrol bandı küçültüldü. **Finish test**, yıldızlar ve ilerleme düğmesi aynı satırda. Küçük görseller dar ekranlarda yatay kaydırılabilir.
- `public/app.js` görsel üzerinde iki parmakla 4× yakınlaşmayı ve yakınlaştırılmış görseli iki yönde sürüklemeyi destekler. Görsel değişiminde veya ekran boyutu değiştiğinde görsel başlangıç ölçeğine döner. Kontroller güvenli ekran kenarlarını hesaba katar.
- `npm test`, Impeccable taraması, `git diff --check` ve 472 dosyalık medya envanteri geçti. Playwright ile 320–1440 px yerleşim, erken bitirme, izole oy kaydı ve gerçek arşivden yeni prompt açma doğrulandı. Chromium dokunmatik tarayıcı emülasyonunda pinch, iki eksende sürükleme, yatay küçük resim kaydırma ve ekran yönü değişimi kontrol edildi. Canlı veritabanına oy yazılmadı. Migration gerekmiyor.

### Erken bitirme onayı ve yeni ana sayfa görseli

- `public/app.js`, `public/index.html` ve `public/styles.css` test boyunca sol altta **Finish test** düğmesi gösterir. Onay penceresi kalan puanlanmamış görsel sayısını ve sonuçların verilen puanlarla sınırlı olacağını açıklar. İptal mevcut puanları korur. Tüm görseller puanlandıysa uyarı atlanır. Puan yoksa sonuç ekranı boş durumu gösterir ve oy gönderilmez.
- Sonuç galerisi yalnızca puanlanan görselleri gösterir. Ana sayfadaki araba görselinin yerini mevcut test arşivinden fırtınalı kıyı sahnesi aldı. Arşiv, API ve veritabanı değişmedi.
- `npm test`, JavaScript sözdizimi ve `git diff --check` geçti. Playwright masaüstü ve mobilde iptal, kısmi puanla bitirme, puansız bitirme ve tüm görselleri puanlama akışlarını doğruladı. Gerçek arşivde sayaç 278'den 277'ye indi. Canlıya oy yazılmadı. Impeccable'ın diyalog kenar boşluğu uyarısı tarayıcıda ölçüldü ve görsel olarak kontrol edildi. Migration gerekmiyor.

### Crafted Anomaly bağlantısı ve yalnızca görsel modu

- `public/index.html` ve `public/app.js` ana sayfa, topluluk sonuçları ve kişisel sonuçların sağ altına **Crafted Anomaly Project** bağlantısı ekler. Hedefin `craftedanomaly.com` olduğu ve açıldığı doğrulandı.
- Test görselinin sağ üstündeki düğme promptu, ilerlemeyi, küçük görselleri ve puanlama araçlarını gizler. Aynı düğme veya Escape kontrolleri geri getirir. Seçili görsel ve puanlar korunur. `public/styles.css` sonuç bağlantısını galeri kaydırmasından ayrı tutar ve kısa yatay ekranlarda ana sayfa düğmeleriyle çakışmayı önler.
- `npm test`, JavaScript sözdizimi kontrolü, Impeccable taraması ve `git diff --check` geçti. Playwright 320–1440 px aralığında yerleşimi, masaüstü ve dokunmatik görsel modunu, Escape çıkışını, puanın korunmasını ve sonuç bağlantısının konumunu doğruladı. Oylar izole veritabanına yazıldı. Migration gerekmiyor.

### Maybach promptunun kaldırılması ve ana ekran hizası

- Maybach promptu `data/benchmark.json` dosyasından, ona ait altı WebP de `public/media/` klasöründen çıkarıldı. Tek testte 58 prompt ve 278 görsel kaldı. Mevcut test ve kampanya kimlikleri korundu. Veritabanı migration'ı gerekmiyor.
- `public/styles.css` masaüstü açılışında başlığı, açıklamayı ve düğmeleri yaklaşık 46 px sağa alır (1440 px genişlikte). Mobil hizalama korundu.
- `npm test`, Impeccable taraması, medya envanteri ve `git diff --check` geçti. Playwright 320–1440 px aralığında taşma olmadığını, masaüstü ve mobil konumları ve iki izole puanlama akışını doğruladı. Canlı veritabanına test oyu yazılmadı.

### Tek İngilizce test ve tam ekran açılış

- `data/benchmark.json` dört arşivi tek teste birleştirir. Meeple Press promptu ve dört WebP dosyası yayın paketinden çıkarıldı. Kalan 59 promptun sırası ve 284 görselin model eşleşmeleri doğrulandı. Bir promptun Türkçe açıklaması İngilizceye çevrildi. Görsellerde istenen özel ad ve metinler korundu.
- `public/index.html`, `public/styles.css` ve `public/app.js` arşiv ana sayfasını tek tam ekran fotoğraf, sağa doğru kararan geçiş, büyük başlık ve iki düğme ile değiştirir. Topluluk sonuçları aynı ekranda animasyonla açılır ve azaltılmış hareket tercihine uyar. Puanlama, sonuçlar ve API hata mesajları İngilizce. En az bir puandan sonra test erken bitirilebilir. Başlık yazı tipi lisansıyla birlikte yerel olarak sunulur.
- Aynı Supabase kampanyası kullanılır. Birleşik testin yeni kimliği vardır. Çalışma öncesinde canlı toplulukta kayıtlı katılımcı görünmüyordu. Veritabanı migration'ı veya Vercel ortam değişkeni değişikliği gerekmez.
- `npm test`, JavaScript sözdizimi kontrolü ve `git diff --check` geçti. Playwright 320, 390, 700, 768 ve 1440 px genişliklerde açılış taşması, sonuç animasyonu, klavye odağı ve azaltılmış hareket tercihini doğruladı. Masaüstü ve mobil puanlama izole veritabanında doğrulandı. Canlıya deneme oyu yazılmadı.

### Görsel test arayüzü iyileştirmeleri

- Impeccable yerel Codex skill dizinine kuruldu ve mevcut arayüzü iyileştirmek için kullanıldı. Skill dosyaları repoya eklenmedi.
- `public/index.html`, `public/app.js` ve `public/styles.css` ana sayfada aynı prompttan iki gerçek örnek, test kapakları, arşiv ve sıralama bağlantıları ve yarıda bırakılan testlere devam etiketi sunar. Kör değerlendirmede prompt ilerlemesi görünür. Görsel alanı, yıldız kontrolleri ve sonuç galerisi dar ekranlara uyarlandı.
- API ve veritabanı işleyişi değişmedi. `npm test` ve `git diff --check` geçti. Playwright ile 320–1360 px aralığında yerleşim, masaüstü ve dokunmatik prompt açma, izole ortamda puanlama ve sonuçlar, gerçek arşivde 288 görsel sayısı ve klavye odağı doğrulandı. Canlı veritabanına oy yazılmadı. Impeccable taraması mevcut açık ve sıcak arka planı işaretledi. Arşivin mevcut görsel diliyle tutarlılık için bu palet korundu.
- Migration gerekmiyor. Canlı dağıtım durumu GitHub ve Vercel bağlantısına bağlı.

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
