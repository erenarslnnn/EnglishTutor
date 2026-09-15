# EnglishTutor — Proje İndeksi

Bu dosya, projeye her dönüşte baştan tüm dosyaları taramamak için tutulan özet haritadır. Yeni bir görev gelince önce burayı oku; sadece göreve özel dosyaları detaylı oku/aç.

## Ne Bu Proje

"Elizaveta Tarasova" adlı bir İngilizce özel öğretmeni/akademik danışmanlık markası için **backend'siz, statik, 3 dilli (EN/TR/RU)** tek sayfalık tanıtım sitesi + kendi kendine yeten bir admin içerik paneli. Git deposu yok (proje `git init` edilmemiş durumda).

Domain: `elizavetatarasova.com` (canonical URL'lerde geçiyor, henüz gerçek deploy durumu bilinmiyor).

## Dosya Haritası

- **[index.html](index.html)** (~995 satır) — Asıl site. Bölümler sırayla: `#hero`, `#about` (3 pillar), `#curriculum` (3 sekmeli: stem/humanities/testing), `#mentorship`, `#pricing` (3 tier), `#faq` (accordion), `#contact` (form + WhatsApp/Telegram/email kartları), footer, privacy-policy modal. Sonda 3 ayrı `<script>` bloğu: (1) curriculum tab + FAQ accordion mantığı, (2) mobile drawer + privacy modal, (3) dil değiştirme + telefon input maskesi + Formspree form submit.
- **[admin.html](admin.html)** (~287 satır) — Şifreyle korunan (`sapphire2026`, sadece caydırıcı, gerçek güvenlik değil) CMS paneli. `SITE_SCHEMA`'yı okuyup sol menü + form alanlarını otomatik üretir, her input değişikliğinde `localStorage`'a debounce'lu kaydeder. "content.json İndir/İçe Aktar/Bu Dili Sıfırla" butonları var.
- **[content-data.js](content-data.js)** (~786 satır) — `window.SITE_CONTENT_DEFAULT` (en/tr/ru üç ayrı obje, aynı şekil) + `window.SITE_SCHEMA` (admin formunu üreten alan tanımları, `key` değerleri `content-data.js` içindeki nokta-yollarıyla eşleşir).
- **[site-i18n.js](site-i18n.js)** (~236 satır) — `window.SapphireContent` motoru: `getContent()/saveContent()/getPath()/setPath()/deepMerge()/exportJSON()/importJSON()/applyLangToDocument()`. Defaults + localStorage override'ları birleştirip DOM'daki `data-i18n*` attribute'larına uygular.
- **assets/css/tailwind.css, tailwind-admin.css** — Derlenmiş Tailwind bundle'ları, Material Design 3 esintili özel token'lar (`bg-canvas-parchment`, `text-primary`, `surface-card`, `on-primary-container`, `text-headline-lg` gibi custom utility class'lar). El ile düzenlenmiyor, muhtemelen bir build adımından üretildi (build script proje içinde yok).
- **assets/icons/icons.json** — Kullanılmayan referans ikon kütüphanesi (SVG'ler zaten HTML'e inline gömülü).
- **robots.txt / sitemap.xml** — `/admin.html` disallow edilmiş, SEO standart.

## Mimari — Kritik Noktalar

1. **Backend yok.** Tüm "veritabanı" `content-data.js` (kaynak/varsayılan) + tarayıcı `localStorage["sapphire_content_v1"]` (override, admin'de yapılan değişiklikler). Kalıcı yayına almak için admin'den "content.json İndir" → elle `content-data.js`'nin yerine geçecek şekilde siteye yüklenmesi gerekiyor (şu an otomatik değil).
2. **i18n binding**: Her metin elemanı `data-i18n="path.to.key"` taşır (örn. `hero.title`, `pricing.tier2.features.0`). Varyantlar: `data-i18n-placeholder`, `data-i18n-href`, `data-i18n-title`, `data-i18n-alt`, `data-i18n-html`. HTML içindeki görünür metin sadece **fallback/placeholder**'dır — gerçek içerik her zaman `content-data.js`'den JS ile enjekte edilir.
3. **Form gönderimi**: `#consultation-form` → Formspree (`https://formspree.io/f/mbgjnvvk`) endpoint'ine doğrudan `fetch` POST. Sunucu tarafı kod yok.
4. **Dil tercihi**: `localStorage["sapphire_lang_v1"]`, sayfa yüklenince `setLang()` ile uygulanıyor.
5. **Versiyon cache-busting**: Script tag'lerinde `?v=20260915d` query param — içerik/JS değiştiğinde bu tarihi güncellemek gerekebilir (tarayıcı cache'i için).

## Bilinen Tutarsızlık (henüz düzeltilmedi)

Site anlatısı ikiye bölünmüş: SEO title + `curriculum` bölümü "İngilizce özel ders / IELTS / TOEFL" odaklı; ama `hero`, `about`, `mentorship`, `pricing` bölümleri hâlâ "Oxbridge/Ivy League üniversite kabul mentorluğu" (Economics Tripos, Mathematics HL gibi) dilinde. Muhtemelen bir "admissions coaching" şablonu kısmen "İngilizce öğretmenliği"ne çevrilmiş. Kullanıcıya bildirildi, henüz düzeltme kararı verilmedi.

## Nasıl Çalışılır

- Metin/içerik değişikliği → `content-data.js` içindeki ilgili dil objesini düzenle (üç dilde de tutarlı tut) — admin panelden manuel test etmeye gerek yok, doğrudan dosyayı düzenlemek daha hızlı.
- Yeni bir metin alanı eklenirse → hem `SITE_CONTENT_DEFAULT` üç dilde hem de `SITE_SCHEMA`'ya admin alanı eklenmeli, hem de `index.html`'de ilgili elemana `data-i18n="..."` eklenmeli.
- Yeni bölüm/HTML yapısı → mevcut section'ların class pattern'ini takip et (`max-w-[1280px] mx-auto px-margin`, custom Tailwind token'ları, inline SVG ikonlar `assets/icons/icons.json`'dan kopyalanabilir).
- Görsel test için tarayıcıda `index.html`'i aç (build adımı yok, doğrudan statik dosya).
