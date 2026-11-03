import { supabase, esc, safeUrl, $, getProfile, applyProfile, CATEGORY_LABELS } from './common.js';

const state = { all: [], filter: 'all', query: '' };

const params = new URLSearchParams(location.search);
state.filter = params.get('kategori') || 'all';
state.query = params.get('q') || '';
$('#q').value = state.query;

function syncUrl() {
  const p = new URLSearchParams();
  if (state.filter !== 'all') p.set('kategori', state.filter);
  if (state.query) p.set('q', state.query);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

function matches(p) {
  const q = state.query.trim().toLocaleLowerCase('tr');
  if (!q) return true;
  return [p.title, p.description, ...(p.tech || []), ...(p.features || [])].join(' ').toLocaleLowerCase('tr').includes(q);
}

function renderFilters() {
  const cats = ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => state.all.some((p) => p.category === c))];
  $('#filters').innerHTML = cats.map((c) => {
    const count = c === 'all' ? state.all.length : state.all.filter((p) => p.category === c).length;
    const label = c === 'all' ? 'Tümü' : CATEGORY_LABELS[c];
    return `<button type="button" class="filter-btn" data-cat="${esc(c)}" aria-pressed="${state.filter === c}">${esc(label)}<span class="count">${count}</span></button>`;
  }).join('');
}

function card(p) {
  const features = (p.features || []).map((f) => `<li>${esc(f)}</li>`).join('');
  const tech = (p.tech || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  const gh = safeUrl(p.github_url);
  const demo = safeUrl(p.demo_url);
  return `<article class="project-card">
    <header><span>${esc((CATEGORY_LABELS[p.category] || '').toLocaleUpperCase('tr'))}</span>${p.featured ? '<span class="badge-featured">ÖNE ÇIKAN</span>' : ''}</header>
    <div class="body">
      <h2>${esc(p.title)}</h2>
      <p class="desc">${esc(p.description)}</p>
      ${features ? `<ul class="checklist">${features}</ul>` : '<div style="flex-grow:1"></div>'}
      <div class="chips">${tech}</div>
      <div class="project-links">
        ${gh ? `<a class="btn" href="${esc(gh)}" target="_blank" rel="noopener" aria-label="${esc(p.title)} — GitHub'da incele">GitHub'da incele ↗</a>` : ''}
        ${demo ? `<a class="btn btn-primary" href="${esc(demo)}" target="_blank" rel="noopener">Canlı demo ↗</a>` : ''}
      </div>
    </div>
  </article>`;
}

function render() {
  renderFilters();
  const shown = state.all.filter((p) => (state.filter === 'all' || p.category === state.filter) && matches(p));
  $('#projects').innerHTML = shown.map(card).join('');
  $('#empty').hidden = shown.length > 0;
  $('#result-count').textContent = `${shown.length} proje gösteriliyor`;
  syncUrl();
}

$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  state.filter = btn.dataset.cat;
  render();
});

let t;
$('#q').addEventListener('input', (e) => {
  clearTimeout(t);
  t = setTimeout(() => { state.query = e.target.value; render(); }, 150);
});

$('#reset').addEventListener('click', () => {
  state.filter = 'all'; state.query = ''; $('#q').value = ''; render();
});

async function load() {
  const [profile, res] = await Promise.all([
    getProfile(),
    supabase.from('projects').select('*').eq('visible', true).order('sort_order').order('id')
  ]);
  applyProfile(profile);
  if (res.error) {
    console.error(res.error);
    $('#projects').innerHTML = '';
    $('#result-count').textContent = 'Projeler yüklenemedi, lütfen sayfayı yenile.';
    return;
  }
  state.all = res.data || [];
  render();
}

load();
