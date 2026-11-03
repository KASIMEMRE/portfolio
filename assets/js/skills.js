import { supabase, esc, $, getProfile, applyProfile, GROUP_LABELS, GROUP_INTROS } from './common.js';

const state = { skills: [], filter: 'all', profile: null };

function usedLink(name) {
  // "Bu portfolyo" gibi proje dışı etiketler ana sayfaya, diğerleri proje aramasına gider
  if (/portfolyo/i.test(name)) return 'index.html';
  if (/tüm projeler/i.test(name)) return 'projeler.html';
  return `projeler.html?q=${encodeURIComponent(name)}`;
}

function skillCard(s) {
  const used = (s.used_in || []).map((u) => `<a href="${esc(usedLink(u))}">${esc(u)}</a>`).join('');
  return `<article class="skill-card">
    <div class="head"><span class="skill-icon" aria-hidden="true">${esc(s.abbr || s.name.slice(0, 2))}</span><h3>${esc(s.name)}</h3></div>
    <p class="desc">${esc(s.description)}</p>
    ${used ? `<div style="display:flex;flex-direction:column;gap:8px"><p class="used-label">KULLANDIĞIM YERLER</p><div class="used chips">${used}</div></div>` : ''}
  </article>`;
}

function render() {
  const groups = Object.keys(GROUP_LABELS).filter((g) => state.skills.some((s) => s.group_name === g));
  $('#stat-total').textContent = state.skills.length;
  $('#stat-groups').textContent = groups.length;

  $('#filters').innerHTML = ['all', ...groups].map((g) => {
    const label = g === 'all' ? 'Tümü' : GROUP_LABELS[g];
    return `<button type="button" class="filter-btn" data-group="${esc(g)}" aria-pressed="${state.filter === g}">${esc(label)}</button>`;
  }).join('');

  $('#groups').innerHTML = groups
    .filter((g) => state.filter === 'all' || state.filter === g)
    .map((g) => {
      const items = state.skills.filter((s) => s.group_name === g);
      return `<section class="skill-section">
        <div class="skill-section-head"><h2>${esc(GROUP_LABELS[g])}</h2><span class="mono muted" style="font-size:13px">${items.length} teknoloji</span><span class="line"></span></div>
        <p class="muted" style="margin-top:-8px">${esc(GROUP_INTROS[g] || '')}</p>
        <div class="grid-cards" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr))">${items.map(skillCard).join('')}</div>
      </section>`;
    }).join('');

  const p = state.profile;
  const growth = [];
  if (p && p.learning) growth.push(`<div class="skill-group learning"><p class="mono" style="font-size:13px;color:var(--accent)">ŞU AN ÖĞRENİYORUM</p><h3 style="font:700 24px var(--font-display);color:var(--text)">${esc(p.learning)}</h3></div>`);
  if (p && p.next_goal) growth.push(`<div class="skill-group"><p class="mono" style="font-size:13px;color:var(--yellow)">SIRADAKİ HEDEF</p><h3 style="font:700 24px var(--font-display)">${esc(p.next_goal)}</h3></div>`);
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
  const [profile, res] = await Promise.all([
    getProfile(),
    supabase.from('skills').select('*').eq('visible', true).order('sort_order').order('id')
  ]);
  state.profile = profile;
  applyProfile(profile);
  if (res.error) {
    console.error(res.error);
    $('#groups').innerHTML = '<p class="muted">Yetenekler yüklenemedi, lütfen sayfayı yenile.</p>';
    return;
  }
  state.skills = res.data || [];
  render();
}

load();
