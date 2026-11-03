// =========================================================
// Çift dil desteği (TR / EN)
// - Sabit arayüz metinleri: data-i18n="anahtar" (textContent)
//   ve data-i18n-attr="placeholder:anahtar;aria-label:anahtar"
// - Veritabanı içeriği: pick(satır, 'alan') → EN seçiliyse alan_en, boşsa TR
// =========================================================

const DICT = {
  tr: {
    'nav.home': 'Ana sayfa', 'nav.projects': 'Projeler', 'nav.skills': 'Yetenekler', 'nav.contact': 'İletişim',
    'nav.menu': 'Ana menü', 'nav.skip': 'İçeriğe geç', 'nav.social': 'Sosyal bağlantılar',
    'lang.switch': 'Dili değiştir', 'lang.label': 'EN',

    'hero.available': 'Staj ve freelance tekliflerine açık',
    'hero.hello': '// merhaba, ben',
    'hero.tagline': "Kurumsal yazılımları birbirine bağlayan,\n.NET ile backend geliştiren bir yazılımcı.",
    'hero.now': 'Şu an', 'hero.at': '·',
    'hero.cta.projects': 'Projeleri incele', 'hero.cta.contact': 'İletişime geç',
    'hero.code': 'Kod örneği', 'hero.output': 'ÇIKTI', 'hero.out.hello': 'Merhaba, ben', 'hero.out.focus': 'Odak:',

    'stats.label': 'Kısa bilgiler', 'stats.projects': 'yayındaki proje', 'stats.skills': 'teknoloji & yetkinlik',
    'stats.dotnet': 'entegrasyonları', 'stats.school': 'YBS mezunu · NEÜ',

    'home.projects.kicker': '01 / projeler', 'home.projects.title': 'Neler geliştirdim',
    'home.projects.all': 'Tüm projeler →', 'home.projects.allBtn': 'Tüm projeleri gör →',
    'home.skills.kicker': '02 / yetenekler', 'home.skills.title': 'Araç kutum', 'home.skills.all': 'Tüm yetenekler →',
    'home.journey.kicker': '03 / yolculuk', 'home.journey.title': 'Buraya nasıl geldim',
    'home.contact.kicker': '04 / iletişim', 'home.contact.title': 'Birlikte bir şey geliştirelim',
    'home.contact.text': 'Bir entegrasyon ihtiyacı, ortak proje ya da sadece bir soru. Mesajın doğrudan yönetim panelimdeki gelen kutusuna düşer.',
    'learning': 'Şu an öğreniyorum', 'nextGoal': 'Sıradaki hedef',

    'form.name': 'Adın', 'form.email': 'E-posta', 'form.message': 'Mesajın', 'form.send': 'Mesajı gönder',
    'form.sending': 'Gönderiliyor…', 'form.success': 'Mesajın iletildi, teşekkürler!', 'form.successSub': 'En kısa sürede dönüş yapacağım.',
    'form.again': 'Yeni mesaj yaz', 'form.err.required': 'Lütfen tüm alanları doldur.', 'form.err.email': 'Geçerli bir e-posta adresi gir.',
    'form.err.long': 'Mesaj çok uzun.', 'form.err.wait': 'Kısa süre önce mesaj gönderdin, lütfen bir dakika bekle.',
    'form.err.generic': 'Mesaj gönderilemedi, lütfen tekrar dene.', 'form.err.rate': 'Çok fazla mesaj gönderildi, lütfen biraz bekle.',

    'featured': 'ÖNE ÇIKAN', 'inProgress': 'GELİŞTİRİLİYOR', 'viewCode': 'Kodu incele →', 'liveDemo': 'Canlı demo ↗',
    'details': 'Detayları gör →', 'github': "GitHub'da incele ↗", 'githubRepo': 'GitHub deposu',

    'projects.title': 'Tüm projelerim', 'projects.kicker': '// projeler',
    'projects.lead': "Web API'lerden mobil uygulamaya ve komut satırı araçlarına kadar geliştirdiğim projeler. Her birine tıklayarak mimarisini ve kullandığım teknolojileri inceleyebilirsin.",
    'projects.search': 'Projelerde ara…', 'projects.searchLabel': 'Projelerde ara', 'projects.filter': 'Kategoriye göre filtrele',
    'projects.all': 'Tümü', 'projects.count': '{n} proje gösteriliyor', 'projects.empty': 'Eşleşen proje bulunamadı',
    'projects.emptySub': 'Farklı bir kelime dene ya da filtreyi sıfırla.', 'projects.reset': 'Filtreleri temizle',
    'projects.loadError': 'Projeler yüklenemedi, lütfen sayfayı yenile.',
    'projects.more': "Daha fazlası GitHub'da", 'projects.moreSub': 'Denemeler ve küçük araçlar da açık kaynak repolarımda.',
    'projects.allRepos': 'Tüm repolar ↗',

    'project.back': '← Tüm projeler', 'project.about': 'Proje hakkında', 'project.features': 'Öne çıkan özellikler',
    'project.architecture': 'Mimari', 'project.stack': 'Kullanılan teknolojiler', 'project.code': 'Koddan bir parça',
    'project.notFound': 'Proje bulunamadı', 'project.notFoundSub': 'Bağlantı değişmiş olabilir.', 'project.year': 'Yıl',
    'project.category': 'Kategori', 'project.status': 'Durum', 'status.completed': 'Tamamlandı', 'status.in_progress': 'Geliştiriliyor',
    'project.others': 'Diğer projeler',

    'skills.title': 'Araç kutum', 'skills.kicker': '// yetenekler',
    'skills.lead': 'Kullandığım teknolojiler ve her birini hangi projede uyguladığım. Bir projeye tıklayarak detayına gidebilirsin.',
    'skills.techs': 'teknoloji', 'skills.areas': 'alan', 'skills.filter': 'Alana göre filtrele', 'skills.usedIn': 'KULLANDIĞIM YERLER',
    'skills.techCount': '{n} teknoloji', 'skills.loadError': 'Yetenekler yüklenemedi, lütfen sayfayı yenile.',
    'skills.cta': 'Bu yetenekleri iş başında gör', 'skills.ctaSub': 'Her teknolojinin gerçek bir projede nasıl kullanıldığını incele.',
    'skills.toProjects': 'Projelere git →',

    'cat.api': 'Web API', 'cat.cli': 'CLI', 'cat.app': 'Uygulama', 'cat.web': 'Web', 'cat.mobile': 'Mobil',
    'group.enterprise': 'Kurumsal & entegrasyon', 'intro.enterprise': 'İş hayatımın merkezi: kalite yönetim yazılımları ve bunları ERP / üretim sistemlerine bağlayan entegrasyonlar.',
    'group.backend': 'Backend', 'group.data': 'Veri', 'group.mobile': 'Mobil', 'group.web': 'Frontend & araçlar', 'group.approach': 'Yaklaşım',
    'intro.backend': 'Projelerimin omurgası: API tasarımı, iş kuralları ve güvenlik.',
    'intro.data': 'Veriyi modellemek, sorgulamak, güvenle saklamak.',
    'intro.mobile': 'Tek kod tabanından iOS ve Android uygulamaları.',
    'intro.web': 'Arayüz tarafı ve günlük geliştirme araçları.',
    'intro.approach': 'Yönetim Bilişim Sistemleri eğitiminden gelen bakış açısı.',

    'footer.made': '.NET ve kahveyle yapıldı', 'thisPortfolio': 'Bu portfolyo', 'allProjects': 'Tüm projeler', 'workplace': 'İş deneyimi'
  },
  en: {
    'nav.home': 'Home', 'nav.projects': 'Projects', 'nav.skills': 'Skills', 'nav.contact': 'Contact',
    'nav.menu': 'Main menu', 'nav.skip': 'Skip to content', 'nav.social': 'Social links',
    'lang.switch': 'Change language', 'lang.label': 'TR',

    'hero.available': 'Open to internships and freelance work',
    'hero.hello': '// hi, I am',
    'hero.tagline': 'A developer who connects enterprise software\nand builds backends with .NET.',
    'hero.now': 'Currently', 'hero.at': '·',
    'hero.cta.projects': 'Explore projects', 'hero.cta.contact': 'Get in touch',
    'hero.code': 'Code sample', 'hero.output': 'OUTPUT', 'hero.out.hello': "Hi, I'm", 'hero.out.focus': 'Focus:',

    'stats.label': 'Quick facts', 'stats.projects': 'published projects', 'stats.skills': 'technologies & skills',
    'stats.dotnet': 'integrations', 'stats.school': 'MIS graduate · NEU',

    'home.projects.kicker': '01 / projects', 'home.projects.title': "What I've built",
    'home.projects.all': 'All projects →', 'home.projects.allBtn': 'See all projects →',
    'home.skills.kicker': '02 / skills', 'home.skills.title': 'My toolbox', 'home.skills.all': 'All skills →',
    'home.journey.kicker': '03 / journey', 'home.journey.title': 'How I got here',
    'home.contact.kicker': '04 / contact', 'home.contact.title': "Let's build something together",
    'home.contact.text': 'An integration need, a project or just a question — your message lands straight in my admin inbox.',
    'learning': 'Currently learning', 'nextGoal': 'Next goal',

    'form.name': 'Your name', 'form.email': 'Email', 'form.message': 'Your message', 'form.send': 'Send message',
    'form.sending': 'Sending…', 'form.success': 'Message sent — thank you!', 'form.successSub': "I'll get back to you as soon as I can.",
    'form.again': 'Write another message', 'form.err.required': 'Please fill in every field.', 'form.err.email': 'Please enter a valid email address.',
    'form.err.long': 'The message is too long.', 'form.err.wait': 'You just sent a message — please wait a minute.',
    'form.err.generic': 'The message could not be sent, please try again.', 'form.err.rate': 'Too many messages were sent, please wait a little.',

    'featured': 'FEATURED', 'inProgress': 'IN PROGRESS', 'viewCode': 'View the code →', 'liveDemo': 'Live demo ↗',
    'details': 'See details →', 'github': 'View on GitHub ↗', 'githubRepo': 'GitHub repository',

    'projects.title': 'All projects', 'projects.kicker': '// projects',
    'projects.lead': 'From web APIs to a mobile app and command-line tools. Open any project to see its architecture and the technologies I used.',
    'projects.search': 'Search projects…', 'projects.searchLabel': 'Search projects', 'projects.filter': 'Filter by category',
    'projects.all': 'All', 'projects.count': 'Showing {n} projects', 'projects.empty': 'No matching projects',
    'projects.emptySub': 'Try another keyword or reset the filters.', 'projects.reset': 'Clear filters',
    'projects.loadError': 'Projects could not be loaded, please refresh the page.',
    'projects.more': 'More on GitHub', 'projects.moreSub': 'Experiments and small tools live in my open-source repositories too.',
    'projects.allRepos': 'All repositories ↗',

    'project.back': '← All projects', 'project.about': 'About the project', 'project.features': 'Key features',
    'project.architecture': 'Architecture', 'project.stack': 'Tech stack', 'project.code': 'A piece of the code',
    'project.notFound': 'Project not found', 'project.notFoundSub': 'The link may have changed.', 'project.year': 'Year',
    'project.category': 'Category', 'project.status': 'Status', 'status.completed': 'Completed', 'status.in_progress': 'In progress',
    'project.others': 'Other projects',

    'skills.title': 'My toolbox', 'skills.kicker': '// skills',
    'skills.lead': 'The technologies I use and the projects where I applied each one. Click a project to see its details.',
    'skills.techs': 'technologies', 'skills.areas': 'areas', 'skills.filter': 'Filter by area', 'skills.usedIn': 'WHERE I USED IT',
    'skills.techCount': '{n} technologies', 'skills.loadError': 'Skills could not be loaded, please refresh the page.',
    'skills.cta': 'See these skills in action', 'skills.ctaSub': 'Explore how each technology is used in a real project.',
    'skills.toProjects': 'Go to projects →',

    'cat.api': 'Web API', 'cat.cli': 'CLI', 'cat.app': 'Application', 'cat.web': 'Web', 'cat.mobile': 'Mobile',
    'group.enterprise': 'Enterprise & integration', 'intro.enterprise': 'The core of my day job: quality management software and the integrations that connect it to ERP and manufacturing systems.',
    'group.backend': 'Backend', 'group.data': 'Data', 'group.mobile': 'Mobile', 'group.web': 'Frontend & tools', 'group.approach': 'Approach',
    'intro.backend': 'The backbone of my projects: API design, business rules and security.',
    'intro.data': 'Modelling, querying and safely storing data.',
    'intro.mobile': 'iOS and Android apps from a single codebase.',
    'intro.web': 'The interface side and everyday development tools.',
    'intro.approach': 'A perspective shaped by studying Management Information Systems.',

    'footer.made': 'Built with .NET and coffee', 'thisPortfolio': 'This portfolio', 'allProjects': 'All projects', 'workplace': 'Work experience'
  }
};

const STORAGE_KEY = 'lang';

function detect() {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (fromUrl === 'tr' || fromUrl === 'en') return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'tr' || saved === 'en') return saved;
  } catch (_) { /* yok say */ }
  return (navigator.language || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

let current = detect();

export function lang() { return current; }

/** Sözlükten metin; {n} gibi yer tutucuları doldurur. */
export function t(key, vars) {
  let s = (DICT[current] && DICT[current][key]) ?? DICT.tr[key] ?? key;
  if (vars) Object.entries(vars).forEach(([k, v]) => { s = s.replaceAll(`{${k}}`, String(v)); });
  return s;
}

/** Veritabanı satırından dile uygun alan: EN seçiliyse ve doluysa alan_en, değilse TR. */
export function pick(row, field) {
  if (!row) return '';
  if (current === 'en') {
    const en = row[field + '_en'];
    if (Array.isArray(en) ? en.length > 0 : (en != null && String(en).trim() !== '')) return en;
  }
  return row[field];
}

/** Sayfadaki data-i18n etiketlerini uygular. */
export function applyI18n(root = document) {
  document.documentElement.lang = current;
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  root.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.textContent = t('lang.label');
    btn.setAttribute('aria-label', t('lang.switch'));
    btn.setAttribute('lang', current === 'tr' ? 'en' : 'tr');
  });
}

export function setLang(next) {
  if (next !== 'tr' && next !== 'en') return;
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch (_) { /* yok say */ }
  applyI18n();
  window.dispatchEvent(new CustomEvent('langchange', { detail: next }));
}

/** Başlıktaki dil düğmesini bağlar. */
export function initLangToggle() {
  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => setLang(current === 'tr' ? 'en' : 'tr'));
  });
  applyI18n();
}
