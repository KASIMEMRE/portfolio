import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { t, pick, lang, initLangToggle } from './i18n.js';
import { initTheme } from './theme.js';

// Supabase kütüphanesi, sürümü sabitlenmiş yerel kopyadan yüklenir (assets/vendor).
// Dış CDN'e bağımlılık yok; içerik güvenlik politikası (CSP) yalnızca kendi dosyalarımıza izin verir.
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase kütüphanesi yüklenemedi.');
}
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// Admin paneli Türkçe etiketleri kullanır; site tarafı i18n üzerinden çevirir.
export const CATEGORY_LABELS = { api: 'Web API', ai: 'Yapay zekâ', mobile: 'Mobil', cli: 'CLI', app: 'Uygulama', web: 'Web' };
export const GROUP_LABELS = { enterprise: 'Kurumsal & entegrasyon', backend: 'Backend', data: 'Veri', mobile: 'Mobil', web: 'Frontend & araçlar', approach: 'Yaklaşım' };
export const GROUP_ORDER = ['enterprise', 'backend', 'data', 'mobile', 'web', 'approach'];

export const catLabel = (c) => t('cat.' + c);
export const groupLabel = (g) => t('group.' + g);

/** HTML kaçışı: veritabanından gelen her metin bununla basılır. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sadece https ve mailto bağlantılarına izin ver (javascript:, data: vb. engellenir). */
export function safeUrl(url) {
  const u = String(url ?? '').trim();
  return /^(https:\/\/|mailto:)/i.test(u) ? u : '';
}

const EMAIL_RE = /^[^\s@<>?&;,"]+@[^\s@<>?&;,"]+\.[A-Za-z]{2,}$/;
export function isEmail(v) { return EMAIL_RE.test(String(v ?? '').trim()); }

/** Geçerli e-postadan güvenli mailto bağlantısı üretir; ?cc=, &body= gibi enjeksiyonları engeller. */
export function mailtoUrl(email, subject) {
  const e = String(email ?? '').trim();
  if (!isEmail(e)) return '';
  return 'mailto:' + e + (subject ? '?subject=' + encodeURIComponent(subject) : '');
}

/** Proje detay sayfası bağlantısı (slug güvenli karakterlerle sınırlı). */
export function projectUrl(p) {
  const slug = String(p?.slug || '');
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? `proje.html?p=${slug}` : 'projeler.html';
}

export const upper = (s) => String(s ?? '').toLocaleUpperCase(lang() === 'tr' ? 'tr' : 'en');

export function $(sel, root = document) { return root.querySelector(sel); }
export function $all(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function toast(message, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = (isError ? '' : '✓ ') + message;
  el.classList.toggle('error', isError);
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 2600);
}

export async function getProfile() {
  const { data, error } = await supabase.from('profile').select('*').eq('id', 1).maybeSingle();
  if (error) console.error(error);
  return data;
}

/** Profil verisini [data-profile="alan"] olan elemanlara basar (dile göre), sosyal bağlantıları günceller. */
export function applyProfile(p) {
  if (!p) return;
  $all('[data-profile]').forEach((el) => {
    const v = pick(p, el.dataset.profile);
    if (v != null && v !== '') el.textContent = v;
  });
  const links = { github: p.github_url, linkedin: p.linkedin_url, instagram: p.instagram_url, email: mailtoUrl(p.email) };
  $all('[data-link]').forEach((a) => {
    const url = safeUrl(links[a.dataset.link]);
    if (url) a.href = url; else a.hidden = true;
  });
  $all('[data-available]').forEach((el) => { el.hidden = !p.available; });
}

/** Sayfa girişinde kaydırdıkça beliren bölümler. */
export function initReveal() {
  const items = $all('.reveal');
  if (!('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  items.forEach((i) => io.observe(i));
}

export function techChips(list) {
  return (list || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('');
}

/* =========================================================
   Galeri: yalnızca sitenin kendi klasöründeki görseller
   ========================================================= */
const IMG_RE = /^assets\/img\/[a-z0-9_-]+(\/[a-z0-9_-]+)*\.(webp|png|jpe?g)$/;

/** Projenin geçerli galeri öğeleri (dile göre açıklama ile). */
export function galleryOf(p) {
  return (Array.isArray(p?.gallery) ? p.gallery : [])
    .filter((g) => g && IMG_RE.test(String(g.src || '')))
    .map((g) => ({
      src: g.src,
      w: Number(g.w) || 0,
      h: Number(g.h) || 0,
      alt: (lang() === 'en' && g.alt_en) ? g.alt_en : (g.alt || pick(p, 'title'))
    }));
}
export const isPhoneShot = (g) => g.h > g.w * 1.3;

function imgTag(g, cls = '', eager = false) {
  const size = g.w && g.h ? ` width="${g.w}" height="${g.h}"` : '';
  return `<img class="${cls}" src="${esc(g.src)}" alt="${esc(g.alt)}"${size} loading="${eager ? 'eager' : 'lazy'}" decoding="async">`;
}

/** Kart kapağı: telefon ekranlarında 3'lü şerit, masaüstünde üstten kırpılmış görsel. */
export function coverHtml(p, max = 3) {
  const items = galleryOf(p);
  if (!items.length) return '';
  if (isPhoneShot(items[0])) {
    const phones = items.filter(isPhoneShot).slice(0, max);
    return `<div class="cover cover-phones" aria-hidden="true">${phones.map((g) => `<div class="phone">${imgTag(g)}</div>`).join('')}</div>`;
  }
  return `<div class="cover cover-desktop" aria-hidden="true">${imgTag(items[0])}</div>`;
}

/** Detay sayfası galerisi: her görsel büyütmek için bir düğme. */
export function galleryHtml(p) {
  const items = galleryOf(p);
  if (!items.length) return '';
  const phone = isPhoneShot(items[0]);
  const cells = items.map((g, i) => `<li><button type="button" class="shot ${phone ? 'shot-phone' : 'shot-desktop'}" data-shot="${i}" aria-label="${esc(t('gallery.open'))}: ${esc(g.alt)}">
      ${phone ? '' : '<span class="browser-bar" aria-hidden="true"><i></i><i></i><i></i></span>'}${imgTag(g, '', i < 2)}</button>
      <span class="shot-caption">${esc(g.alt)}</span></li>`).join('');
  return `<ul class="gallery ${phone ? 'gallery-phones' : 'gallery-desktop'}">${cells}</ul>`;
}

/** Büyütülmüş görünüm (dialog): ok tuşları, Esc ve dokunmatik kaydırma ile gezinme. */
let lightbox;
export function openLightbox(items, start = 0) {
  if (!items.length) return;
  if (!lightbox) {
    lightbox = document.createElement('dialog');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `<figure><img alt=""><figcaption><span class="lb-caption"></span><span class="lb-count mono"></span></figcaption></figure>
      <button type="button" class="lb-btn lb-prev"><span aria-hidden="true">‹</span></button>
      <button type="button" class="lb-btn lb-next"><span aria-hidden="true">›</span></button>
      <button type="button" class="lb-btn lb-close"><span aria-hidden="true">×</span></button>`;
    document.body.appendChild(lightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.close();
      else if (e.target.closest('.lb-close')) lightbox.close();
      else if (e.target.closest('.lb-prev')) lightbox._go(-1);
      else if (e.target.closest('.lb-next')) lightbox._go(1);
    });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); lightbox._go(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); lightbox._go(1); }
    });
    let x0 = null;
    lightbox.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) lightbox._go(dx < 0 ? 1 : -1);
    }, { passive: true });
    lightbox.addEventListener('close', () => { document.body.style.overflow = ''; lightbox._return?.focus(); });
  }
  const img = lightbox.querySelector('img');
  let i = start;
  lightbox._items = items;
  lightbox._go = (d) => { i = (i + d + items.length) % items.length; show(); };
  const show = () => {
    const g = items[i];
    img.src = g.src; img.alt = g.alt;
    if (g.w && g.h) { img.width = g.w; img.height = g.h; }
    lightbox.classList.toggle('is-phone', isPhoneShot(g));
    lightbox.querySelector('.lb-caption').textContent = g.alt;
    lightbox.querySelector('.lb-count').textContent = `${i + 1} / ${items.length}`;
  };
  lightbox.setAttribute('aria-label', t('project.gallery'));
  lightbox.querySelector('.lb-close').setAttribute('aria-label', t('gallery.close'));
  lightbox.querySelector('.lb-prev').setAttribute('aria-label', t('gallery.prev'));
  lightbox.querySelector('.lb-next').setAttribute('aria-label', t('gallery.next'));
  const multi = items.length > 1;
  lightbox.querySelector('.lb-prev').hidden = !multi;
  lightbox.querySelector('.lb-next').hidden = !multi;
  lightbox._return = document.activeElement;
  show();
  document.body.style.overflow = 'hidden';
  lightbox.showModal();
  lightbox.querySelector('.lb-close').focus();
}

export function projectCardSmall(p) {
  const title = pick(p, 'title');
  const status = p.status === 'in_progress' ? `<span class="badge-progress">${esc(t('inProgress'))}</span>` : '';
  return `<article class="card card-link">
    ${coverHtml(p)}
    <div class="card-top"><span>${esc(upper(catLabel(p.category)))}</span>${status}</div>
    <h3><a href="${esc(projectUrl(p))}" class="stretched">${esc(title)}</a></h3>
    <p class="desc">${esc(pick(p, 'description'))}</p>
    <div class="chips">${techChips((p.tech || []).slice(0, 5))}</div>
  </article>`;
}

/** Her sayfanın ortak başlangıcı: dil düğmesi + yıl. */
export function initPage() {
  initLangToggle();
  initTheme();
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
}
