import { supabase, esc, safeUrl, $, getProfile, applyProfile, initPage, catLabel, upper, projectUrl, techChips, CATEGORY_LABELS } from './common.js';
import { t, pick, lang } from './i18n.js';

const state = { all: [], filter: 'all', query: '', profile: null, loaded: false };

const params = new URLSearchParams(location.search);
state.filter = params.get('kategori') || 'all';
if (state.filter !== 'all' && !CATEGORY_LABELS[state.filter]) state.filter = 'all';
state.query = (params.get('q') || '').slice(0, 100);
$('#q').value = state.query;

function syncUrl() {
  const p = new URLSearchParams();
  if (state.filter !== 'all') p.set('kategori', state.filter);
  if (state.query) p.set('q', state.query);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

const norm = (s) => String(s ?? '').toLocaleLowerCase(lang() === 'tr' ? 'tr' : 'en');

function matches(p) {
  const q = norm(state.query.trim());
  if (!q) return true;
  // Her iki dildeki metinlerde ara
  return norm([p.title, p.title_en, p.description, p.description_en, ...(p.tech || []), ...(p.features || []), ...(p.features_en || [])].join(' ')).includes(q);
}

function renderFilters() {
  const cats = ['all', ...Object.keys(CATEGORY_LABELS).filter((c) => state.all.some((p) => p.category === c))];
  $('#filters').innerHTML = cats.map((c) => {
    const count = c === 'all' ? state.all.length : state.all.filter((p) => p.category === c).length;
    const label = c === 'all' ? t('projects.all') : catLabel(c);
    return `<button type="button" class="filter-btn" data-cat="${esc(c)}" aria-pressed="${state.filter === c}">${esc(label)}<span class="count">${count}</span></button>`;
  }).join('');
}

function card(p) {
  const features = (pick(p, 'features') || []).slice(0, 4).map((f) => `<li>${esc(f)}</li>`).join('');
  const gh = safeUrl(p.github_url);
  const title = pick(p, 'title');
  const badges = [
    p.featured ? `<span class="badge-featured">${esc(t('featured'))}</span>` : '',
    p.status === 'in_progress' ? `<span class="badge-progress">${esc(t('inProgress'))}</span>` : ''
  ].join('');
  return `<article class="project-card">
    <header><span>${esc(upper(catLabel(p.category)))}${p.year ? ' · ' + esc(p.year) : ''}</span><span style="display:flex;gap:6px">${badges}</span></header>
    <div class="body">
      <h2><a href="${esc(projectUrl(p))}" class="title-link">${esc(title)}</a></h2>
      <p class="desc">${esc(pick(p, 'description'))}</p>
      ${features ? `<ul class="checklist">${features}</ul>` : '<div style="flex-grow:1"></div>'}
      <div class="chips">${techChips(p.tech)}</div>
      <div class="project-links">
        <a class="btn btn-primary" href="${esc(projectUrl(p))}">${esc(t('details'))}</a>
        ${gh ? `<a class="btn" href="${esc(gh)}" target="_blank" rel="noopener" aria-label="${esc(title)} — ${esc(t('githubRepo'))}">${esc(t('github'))}</a>` : ''}
      </div>
    </div>
  </article>`;
}

function render() {
  if (!state.loaded) return;
  renderFilters();
  const shown = state.all.filter((p) => (state.filter === 'all' || p.category === state.filter) && matches(p));
  $('#projects').innerHTML = shown.map(card).join('');
  $('#empty').hidden = shown.length > 0;
  $('#result-count').textContent = t('projects.count', { n: shown.length });
  syncUrl();
}

$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  state.filter = btn.dataset.cat;
  render();
});

let timer;
$('#q').addEventListener('input', (e) => {
  clearTimeout(timer);
  timer = setTimeout(() => { state.query = e.target.value.slice(0, 100); render(); }, 150);
});

$('#reset').addEventListener('click', () => {
  state.filter = 'all'; state.query = ''; $('#q').value = ''; render();
});

async function load() {
  const [profile, res] = await Promise.all([
    getProfile(),
    supabase.from('projects').select('*').eq('visible', true).order('sort_order').order('id')
  ]);
  state.profile = profile;
  applyProfile(profile);
  if (res.error) {
    console.error(res.error);
    $('#projects').innerHTML = '';
    $('#result-count').textContent = t('projects.loadError');
    return;
  }
  state.all = res.data || [];
  state.loaded = true;
  render();
}

initPage();
window.addEventListener('langchange', () => { applyProfile(state.profile); render(); });
load();
