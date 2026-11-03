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

- Tüm tablolarda **Row Level Security** açık.
- Ziyaretçiler yalnızca yayındaki içeriği okuyabilir ve mesaj gönderebilir.
- Yazma işlemleri yalnızca `admins` tablosundaki e-postayla giriş yapan kullanıcıya açık.
- `assets/js/config.js` içindeki anahtar *publishable* anahtardır; tarayıcıda kullanılmak üzere tasarlanmıştır.
- Ekrana basılan her veri HTML kaçışından geçer; iletişim formunda bot tuzağı ve basit hız sınırı var.

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
3. Dosyanın sonundaki yorumdaki gibi kendi e-postanı `admins` tablosuna ekle.
4. `assets/js/config.js` içindeki URL ve publishable anahtarı kendi projeninkilerle değiştir.

## Yapı

```
├── index.html, projeler.html, yetenekler.html, admin.html
├── assets/
│   ├── css/style.css      # tema ve site bileşenleri
│   ├── css/admin.css      # panel bileşenleri
│   └── js/
│       ├── config.js      # Supabase bağlantısı
│       ├── common.js      # istemci, yardımcılar, ortak bileşenler
│       ├── home.js, projects.js, skills.js
│       └── admin.js       # panel uygulaması
└── supabase/schema.sql    # tablolar, RLS kuralları, yetkiler
```
