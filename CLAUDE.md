# EnglishTutor — Proje İndeksi

Bu dosya, projeye her dönüşte baştan tüm dosyaları taramamak için tutulan özet haritadır. Yeni bir görev gelince önce burayı oku; sadece göreve özel dosyaları detaylı oku/aç.

## Ne Bu Proje

"Elizaveta Tarasova" adlı bir İngilizce özel öğretmeni/akademik danışmanlık markası için **backend'siz, statik, 3 dilli (EN/TR/RU)** tek sayfalık tanıtım sitesi + kendi kendine yeten bir admin içerik paneli. Git deposu var (`main` branch, `origin` remote'a bağlı).

Domain: `elizavetatarasova.com` (canonical URL'lerde geçiyor, henüz gerçek deploy durumu bilinmiyor).

## Dosya Haritası

- **[index.html](index.html)** — Asıl site. Bölümler sırayla: `#hero`, `#about` (3 pillar), `#curriculum` (3 sekmeli: stem/humanities/testing), `#mentorship`, `#pricing` (3 tier), `#faq` (dinamik accordion, sınırsız soru), `#contact` (form + WhatsApp/Telegram/email kartları), footer, privacy-policy modal, sabit "Yukarı Dön" + "WhatsApp" butonları. Sayfaya özel CSS/JS dosya içinde gömülü DEĞİL — bkz. aşağıdaki `assets/css/site.css` ve `assets/js/site.js`. `<head>`'de iki `<script type="application/ld+json">` bloğu var (bilinçli olarak inline bırakıldı; SEO crawler'ları bunu sayfanın kendisinde bekler, dış dosyadan değil): **EducationalOrganization** statik metin olarak duruyor; **FAQPage** (`id="faqpage-jsonld"`) ise HTML'de yok — `site.js`'deki `updateFAQJsonLd()` fonksiyonu tarafından `setLang()` her çağrıldığında (sayfa yüklenince + dil değişince), o an aktif dildeki (soru+cevabı dolu) FAQ girişlerinden yeniden üretilip `<head>`'e enjekte ediliyor — admin panelden yapılan SSS ekleme/silme otomatik olarak buraya da yansır.
- **[admin.html](admin.html)** — Şifreyle korunan (`sapphire2026`, sadece caydırıcı, gerçek güvenlik değil) CMS paneli. `SITE_SCHEMA`'yı okuyup sol menü + form alanlarını otomatik üretir, her input değişikliğinde `localStorage`'a debounce'lu kaydeder. "content.json İndir/İçe Aktar/Bu Dili Sıfırla" butonları var. Sayfaya özel CSS/JS gömülü değil — bkz. `assets/css/admin.css` ve `assets/js/admin.js`.
- **[content-data.js](content-data.js)** — `window.SITE_CONTENT_DEFAULT` (en/tr/ru üç ayrı obje, aynı şekil) + `window.SITE_SCHEMA` (admin formunu üreten alan tanımları, `key` değerleri `content-data.js` içindeki nokta-yollarıyla eşleşir; `list` tipi alanlar — örn. `faq` — admin'de ekle/sil destekli sınırsız liste editörü üretir).
- **[site-i18n.js](site-i18n.js)** — `window.SapphireContent` motoru: `getContent()/saveContent()/getPath()/setPath()/deepMerge()/exportJSON()/importJSON()/applyLangToDocument()`. Defaults + localStorage override'ları birleştirip DOM'daki `data-i18n*` attribute'larına uygular. `deepMerge` dizilerde override'ın uzunluğunu esas alır (kısaltma/silme doğru çalışır).
- **assets/css/tailwind.css, tailwind-admin.css** — Derlenmiş Tailwind bundle'ları, Material Design 3 esintili özel token'lar (`bg-canvas-parchment`, `text-primary`, `surface-card`, `on-primary-container`, `text-headline-lg` gibi custom utility class'lar). **El ile düzenlenmiyor** — proje içinde build script yok; harici bir tooling (muhtemelen dosya değişince otomatik derleyen bir yerel `tailwindcss` watch süreci) tarafından üretiliyor gibi görünüyor ve içerdiği class seti öngörülebilir/garanti değil. **Yeni bir stile ihtiyaç olduğunda bu bundle'lara güvenme** — önce sınıfın gerçekten derlenmiş olup olmadığını kontrol et (`grep`), yoksa `assets/css/site.css` / `assets/css/admin.css` içine el yazımı CSS ekle (mevcut ID/class tabanlı kurallarla aynı desende).
- **assets/css/site.css, assets/css/admin.css** — index.html / admin.html'e özel el yazımı CSS (eskiden HTML içinde `<style>` bloğu olarak duruyordu). Buraya SADECE derlenmiş Tailwind bundle'ında karşılığı olmayan stiller giriyor: sabit-konumlu butonlar (`#back-to-top`, `#whatsapp-float`), modal/accordion/FAQ-liste-editörü stilleri, paylaşılan `.icon-inline` (tüm inline SVG ikonların ortak `display:inline-block;vertical-align:middle` stili) gibi.
- **assets/js/site.js, assets/js/admin.js** — index.html / admin.html'e özel el yazımı JS (eskiden HTML içinde inline `<script>` blokları olarak duruyordu). Her iki `<script src>` etiketi de `defer` ile yükleniyor; `content-data.js`/`site-i18n.js`'den SONRA çalışacağı garanti (onlar defer olmadan, head'de senkron yükleniyor). İki dosya arasında paylaşılan kod yok — index.html ve admin.html'in DOM'u ve davranışı tamamen ayrı, bu yüzden ortak bir `main.js` yerine sayfa-özel dosyalar seçildi.
- **assets/icons/icons.json** — Kullanılmayan referans ikon kütüphanesi (SVG'ler zaten HTML'e inline gömülü).
- **robots.txt / sitemap.xml** — `/admin.html` disallow edilmiş, SEO standart.

## Mimari — Kritik Noktalar

1. **Backend yok.** Tüm "veritabanı" `content-data.js` (kaynak/varsayılan) + tarayıcı `localStorage["sapphire_content_v1"]` (override, admin'de yapılan değişiklikler). Kalıcı yayına almak için admin'den "content.json İndir" → elle `content-data.js`'nin yerine geçecek şekilde siteye yüklenmesi gerekiyor (şu an otomatik değil).
2. **i18n binding**: Her metin elemanı `data-i18n="path.to.key"` taşır (örn. `hero.title`, `pricing.tier2.features.0`). Varyantlar: `data-i18n-placeholder`, `data-i18n-href`, `data-i18n-title`, `data-i18n-alt`, `data-i18n-html`. HTML içindeki görünür metin sadece **fallback/placeholder**'dır — gerçek içerik her zaman `content-data.js`'den JS ile enjekte edilir.
3. **Form gönderimi**: `#consultation-form` → Formspree (`https://formspree.io/f/mbgjnvvk`) endpoint'ine doğrudan `fetch` POST. Sunucu tarafı kod yok.
4. **Dil tercihi**: `localStorage["sapphire_lang_v1"]`, sayfa yüklenince `setLang()` ile uygulanıyor.
5. **Versiyon cache-busting**: `content-data.js`, `site-i18n.js`, `assets/css/site.css`, `assets/js/site.js`, `assets/css/admin.css`, `assets/js/admin.js` hepsi aynı `?v=20260915i` query param'ını taşıyor — bunlardan biri değişince tarihi (aynı değere) güncellemek gerekir (tarayıcı cache'i için). Derlenmiş Tailwind bundle'ları (`tailwind.css`, `tailwind-admin.css`) ve `fonts.css` bu versiyonlamaya dahil değil.

## Bilinen Tutarsızlık (henüz düzeltilmedi)

Site anlatısı ikiye bölünmüş: SEO title + `curriculum` bölümü ve artık `mentorship` bölümü "İngilizce özel ders / IELTS / TOEFL" odaklı (mentorship bölümü İngilizce öğretmenliğine uyarlandı, yer tutucu bilgilerle); ama `hero`, `about`, `pricing` bölümleri hâlâ "Oxbridge/Ivy League üniversite kabul mentorluğu" (Economics Tripos, Mathematics HL gibi) dilinde. Muhtemelen bir "admissions coaching" şablonu kısmen "İngilizce öğretmenliği"ne çevrilmiş. Kullanıcıya bildirildi, henüz düzeltme kararı verilmedi.

## Nasıl Çalışılır

- Metin/içerik değişikliği → `content-data.js` içindeki ilgili dil objesini düzenle (üç dilde de tutarlı tut) — admin panelden manuel test etmeye gerek yok, doğrudan dosyayı düzenlemek daha hızlı.
- Yeni bir metin alanı eklenirse → hem `SITE_CONTENT_DEFAULT` üç dilde hem de `SITE_SCHEMA`'ya admin alanı eklenmeli, hem de `index.html`'de ilgili elemana `data-i18n="..."` eklenmeli.
- Yeni bölüm/HTML yapısı → mevcut section'ların class pattern'ini takip et (`max-w-[1280px] mx-auto px-margin`, custom Tailwind token'ları, inline SVG ikonlar `assets/icons/icons.json`'dan kopyalanabilir).
- Görsel test için tarayıcıda `index.html`'i aç (build adımı yok, doğrudan statik dosya).
