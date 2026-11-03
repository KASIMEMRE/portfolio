import { supabase, esc, $, getProfile, applyProfile, initPage, groupLabel, projectUrl, GROUP_ORDER } from './common.js';
import { t, pick } from './i18n.js';

const state = { skills: [], projects: [], filter: 'all', profile: null, loaded: false };

/** "Kullandığım yerler" etiketini ilgili sayfaya bağlar ve dile göre adlandırır. */
function usedItem(name) {
  if (/portfolyo/i.test(name)) return { label: t('thisPortfolio'), href: 'index.html' };
  if (/tüm projeler/i.test(name)) return { label: t('allProjects'), href: 'projeler.html' };
  const p = state.projects.find((x) => x.title === name || x.title_en === name);
  if (p) return { label: pick(p, 'title'), href: projectUrl(p) };
  return { label: name, href: `projeler.html?q=${encodeURIComponent(name)}` };
}

function skillCard(s) {
  const used = (s.used_in || []).map(usedItem).map((u) => `<a href="${esc(u.href)}">${esc(u.label)}</a>`).join('');
  const name = pick(s, 'name');
  return `<article class="skill-card">
    <div class="head"><span class="skill-icon" aria-hidden="true">${esc(s.abbr || name.slice(0, 2))}</span><h3>${esc(name)}</h3></div>
    <p class="desc">${esc(pick(s, 'description'))}</p>
    ${used ? `<div style="display:flex;flex-direction:column;gap:8px"><p class="used-label">${esc(t('skills.usedIn'))}</p><div class="used chips">${used}</div></div>` : ''}
  </article>`;
}

function render() {
  if (!state.loaded) return;
  const groups = GROUP_ORDER.filter((g) => state.skills.some((s) => s.group_name === g));
  $('#stat-total').textContent = state.skills.length;
  $('#stat-groups').textContent = groups.length;

  $('#filters').innerHTML = ['all', ...groups].map((g) => {
    const label = g === 'all' ? t('projects.all') : groupLabel(g);
    return `<button type="button" class="filter-btn" data-group="${esc(g)}" aria-pressed="${state.filter === g}">${esc(label)}</button>`;
  }).join('');

  $('#groups').innerHTML = groups
    .filter((g) => state.filter === 'all' || state.filter === g)
    .map((g) => {
      const items = state.skills.filter((s) => s.group_name === g);
      return `<section class="skill-section">
        <div class="skill-section-head"><h2>${esc(groupLabel(g))}</h2><span class="mono muted" style="font-size:13px">${esc(t('skills.techCount', { n: items.length }))}</span><span class="line"></span></div>
        <p class="muted" style="margin-top:-8px">${esc(t('intro.' + g))}</p>
        <div class="grid-cards" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr))">${items.map(skillCard).join('')}</div>
      </section>`;
    }).join('');

  const p = state.profile;
  const growth = [];
  const learning = pick(p, 'learning');
  const goal = pick(p, 'next_goal');
  if (learning) growth.push(`<div class="skill-group learning"><p class="mono" style="font-size:13px;color:var(--accent)">${esc(t('learning').toLocaleUpperCase())}</p><h3 style="font:700 24px var(--font-display);color:var(--text)">${esc(learning)}</h3></div>`);
  if (goal) growth.push(`<div class="skill-group"><p class="mono" style="font-size:13px;color:var(--yellow)">${esc(t('nextGoal').toLocaleUpperCase())}</p><h3 style="font:700 24px var(--font-display)">${esc(goal)}</h3></div>`);
  $('#growth').innerHTML = growth.join('');
  $('#growth').hidden = growth.length === 0;
}

$('#filters').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-group]');
  if (!btn) return;
  state.filter = btn.dataset.group;
  render();
});

async function load() {
  const [profile, res, projRes] = await Promise.all([
    getProfile(),
    supabase.from('skills').select('*').eq('visible', true).order('sort_order').order('id'),
    supabase.from('projects').select('title,title_en,slug').eq('visible', true)
  ]);
  state.profile = profile;
  applyProfile(profile);
  if (res.error) {
    console.error(res.error);
    $('#groups').innerHTML = `<p class="muted">${esc(t('skills.loadError'))}</p>`;
    return;
  }
  state.skills = res.data || [];
  state.projects = projRes.data || [];
  state.loaded = true;
  render();
}

initPage();
window.addEventListener('langchange', () => { applyProfile(state.profile); render(); });
load();
