import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { t, pick, lang, initLangToggle } from './i18n.js';

// Supabase kütüphanesi, sürümü sabitlenmiş yerel kopyadan yüklenir (assets/vendor).
// Dış CDN'e bağımlılık yok; içerik güvenlik politikası (CSP) yalnızca kendi dosyalarımıza izin verir.
if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase kütüphanesi yüklenemedi.');
}
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// Admin paneli Türkçe etiketleri kullanır; site tarafı i18n üzerinden çevirir.
export const CATEGORY_LABELS = { api: 'Web API', mobile: 'Mobil', cli: 'CLI', app: 'Uygulama', web: 'Web' };
export const GROUP_LABELS = { backend: 'Backend', data: 'Veri', mobile: 'Mobil', web: 'Frontend & araçlar', approach: 'Yaklaşım' };
export const GROUP_ORDER = ['backend', 'data', 'mobile', 'web', 'approach'];

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

export function projectCardSmall(p) {
  const title = pick(p, 'title');
  const status = p.status === 'in_progress' ? `<span class="badge-progress">${esc(t('inProgress'))}</span>` : '';
  return `<article class="card card-link">
    <div class="card-top"><span>${esc(upper(catLabel(p.category)))}</span>${status}</div>
    <h3><a href="${esc(projectUrl(p))}" class="stretched">${esc(title)}</a></h3>
    <p class="desc">${esc(pick(p, 'description'))}</p>
    <div class="chips">${techChips((p.tech || []).slice(0, 5))}</div>
  </article>`;
}

/** Her sayfanın ortak başlangıcı: dil düğmesi + yıl. */
export function initPage() {
  initLangToggle();
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
}
