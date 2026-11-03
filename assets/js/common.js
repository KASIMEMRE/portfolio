import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const CATEGORY_LABELS = { api: 'Web API', cli: 'CLI', app: 'Uygulama', web: 'Web' };
export const GROUP_LABELS = { backend: 'Backend', data: 'Veri', web: 'Frontend & araçlar', approach: 'Yaklaşım' };
export const GROUP_INTROS = {
  backend: 'Projelerimin omurgası: API tasarımı, iş kuralları ve güvenlik.',
  data: 'Veriyi modellemek, sorgulamak ve tutarlı tutmak.',
  web: 'Arayüz tarafı ve günlük geliştirme araçları.',
  approach: 'Yönetim Bilişim Sistemleri eğitiminden gelen bakış açısı.'
};

/** HTML kaçışı: veritabanından gelen her metin bununla basılır. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sadece http(s) ve mailto bağlantılarına izin ver. */
export function safeUrl(url) {
  const u = String(url ?? '').trim();
  return /^(https?:|mailto:)/i.test(u) ? u : '';
}

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

/** Profil verisini [data-profile="alan"] olan elemanlara basar, sosyal bağlantıları günceller. */
export function applyProfile(p) {
  if (!p) return;
  $all('[data-profile]').forEach((el) => {
    const key = el.dataset.profile;
    if (p[key] != null && p[key] !== '') el.textContent = p[key];
  });
  const links = { github: p.github_url, linkedin: p.linkedin_url, instagram: p.instagram_url, email: p.email ? 'mailto:' + p.email : '' };
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

export function projectCardSmall(p) {
  const tech = (p.tech || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  const gh = safeUrl(p.github_url);
  return `<article class="card">
    <div class="card-top"><span>${esc((CATEGORY_LABELS[p.category] || '').toLocaleUpperCase('tr'))}</span>${gh ? `<a href="${esc(gh)}" target="_blank" rel="noopener" aria-label="${esc(p.title)} GitHub deposu">GitHub ↗</a>` : ''}</div>
    <h3>${esc(p.title)}</h3>
    <p class="desc">${esc(p.description)}</p>
    <div class="chips">${tech}</div>
  </article>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
});
