# Kasım Emre — Portfolyo

GitHub Dark temasıyla Radical vurgularını birleştiren, **admin panelli** kişisel portfolyo sitesi.
Saf HTML/CSS/JavaScript ile yazıldı; veritabanı, kimlik doğrulama ve güvenlik kuralları **Supabase** üzerinde.

## Sayfalar

| Sayfa | Dosya | İçerik |
|---|---|---|
| Ana sayfa | `index.html` | Hero, öne çıkan proje, proje özeti, yetenek grupları, yolculuk, iletişim formu |
| Projeler | `projeler.html` | Arama, kategori filtresi, detaylı proje kartları (`?kategori=api&q=...` destekli) |
| Yetenekler | `yetenekler.html` | Alan filtresi, her teknolojinin kullanıldığı projeler |
| Admin | `admin.html` | Giriş korumalı yönetim paneli |

## Admin paneli

- **Projeler:** ekle, düzenle, sil, sırala, öne çıkar, gizle/yayınla, kod parçası ekle
- **Yetenekler:** ekle, düzenle, sil, grup içinde sırala
- **Yolculuk:** zaman çizelgesi kayıtları
- **Mesajlar:** iletişim formundan gelenler; okundu/okunmadı, yanıtla, sil
- **Profil:** ad, ünvan, bio, sosyal bağlantılar, “tekliflere açık” rozeti, öğrenilen teknoloji, sıradaki hedef

## Güvenlik

**Veritabanı**
- Tüm tablolarda **Row Level Security** açık; ziyaretçi yalnızca yayındaki içeriği okuyabilir ve mesaj gönderebilir.
- **En az yetki:** Supabase'in varsayılan geniş yetkileri (DELETE, TRUNCATE…) kaldırıldı, her rol yalnızca ihtiyaç duyduğu tablo/sütuna erişir.
- **Admin yetkisi kullanıcı kimliğine bağlı** (`auth.uid()`), e-postaya değil; aynı e-postayla açılan sahte hesap admin olamaz.
- Admin kontrol fonksiyonu API'ye kapalı `private` şemasında.
- **Sunucu tarafı spam koruması:** aynı IP'den 10 dakikada en fazla 3, aynı e-postadan saatte 5, toplamda saatte 60 mesaj. IP açık metin saklanmaz, yalnızca özeti tutulur.
- Bağlantılar yalnızca `https://` olabilir; e-posta, uzunluk ve karakter kısıtları veritabanında zorunlu.

**İstemci**
- Ekrana basılan her veri HTML kaçışından geçer; `javascript:` gibi tehlikeli bağlantılar engellenir.
- **Content Security Policy:** yalnızca kendi dosyalarımız ve Supabase'e izin verilir; satır içi script yok.
- **Dış CDN yok:** Supabase kütüphanesi (sürümü sabit, `assets/vendor`) ve fontlar (`assets/fonts`) siteyle birlikte sunulur.
- Admin paneli: iframe içinde açılmaz (clickjacking), 30 dk hareketsizlikte çıkış yapar, art arda hatalı girişte bekletir, arama motorlarına kapalı.
- `assets/js/config.js` içindeki anahtar *publishable* anahtardır; tarayıcıda kullanılmak üzere tasarlanmıştır.

**Supabase panelinden yapılması önerilenler**
- Authentication → Sign In / Providers → **Allow new users to sign up: kapalı**
- Authentication → **Leaked password protection: açık**
- İsteğe bağlı: admin hesabı için **MFA**

## Kurulum

### 1. Admin kullanıcısını oluştur
Supabase Dashboard → **Authentication → Users → Add user → Create new user**
- E-posta: `admins` tablosundaki e-posta
- Şifre: kendi belirlediğin güçlü bir şifre
- “Auto Confirm User” seçili olsun

Sonra `/admin.html` adresinden bu bilgilerle giriş yap.

### 2. Yerelde çalıştır
ES modülleri kullanıldığı için dosyayı doğrudan açmak yerine küçük bir sunucu başlat:

```bash
npx serve .
# ya da
python -m http.server 8000
```

### 3. Yayınla
Repo GitHub Pages ile yayınlanır (Settings → Pages → Branch: `main` / root).
Netlify, Vercel veya Cloudflare Pages'e de olduğu gibi yüklenebilir; derleme adımı yoktur.

### Kendi Supabase projeni kurmak istersen
1. Yeni bir Supabase projesi aç.
2. `supabase/schema.sql` dosyasını SQL Editor'de çalıştır.
3. Admin kullanıcını oluştur, e-postasını `admins` tablosuna ekle (dosyanın sonundaki yorum).
4. `supabase/02_security_hardening.sql` dosyasını çalıştır (admin kaydını kullanıcı kimliğine bağlar ve yetkileri daraltır).
4. `assets/js/config.js` içindeki URL ve publishable anahtarı kendi projeninkilerle değiştir.

## Yapı

```
├── index.html, projeler.html, yetenekler.html, admin.html
├── assets/
│   ├── css/style.css      # tema ve site bileşenleri
│   ├── css/admin.css      # panel bileşenleri
│   ├── css/fonts.css      # yerel fontlar
│   ├── fonts/             # Inter, Space Grotesk, JetBrains Mono (SIL OFL)
│   ├── vendor/            # supabase-js 2.118.0 (MIT), sürümü sabit
│   └── js/
│       ├── config.js      # Supabase bağlantısı
│       ├── common.js      # istemci, yardımcılar, ortak bileşenler
│       ├── home.js, projects.js, skills.js
│       └── admin.js       # panel uygulaması
└── supabase/
    ├── schema.sql                  # tablolar, RLS kuralları
    └── 02_security_hardening.sql   # yetki daraltma, admin bağlama, spam koruması
```
