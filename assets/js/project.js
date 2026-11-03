import { supabase, esc, safeUrl, $, getProfile, applyProfile, initPage, catLabel, upper, projectCardSmall, techChips } from './common.js';
import { t, pick } from './i18n.js';

const slug = new URLSearchParams(location.search).get('p') || '';
const state = { project: null, others: [], profile: null, notFound: false };

function paragraphs(text) {
  return String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`).join('');
}

function render() {
  const box = $('#project');
  if (state.notFound) {
    document.title = `${t('project.notFound')} — Kasım Emre Şekersoy`;
    box.innerHTML = `<div class="empty" style="margin-top:56px"><strong>${esc(t('project.notFound'))}</strong><p>${esc(t('project.notFoundSub'))}</p><a class="btn" href="projeler.html">${esc(t('project.back'))}</a></div>`;
    return;
  }
  const p = state.project;
  if (!p) return;
  const title = pick(p, 'title');
  document.title = `${title} — Kasım Emre Şekersoy`;
  const gh = safeUrl(p.github_url);
  const demo = safeUrl(p.demo_url);
  const features = (pick(p, 'features') || []).map((f) => `<li>${esc(f)}</li>`).join('');
  const arch = (pick(p, 'architecture') || []).map((a) => {
    const i = a.indexOf(':');
    return i > 0
      ? `<li><strong>${esc(a.slice(0, i))}</strong><span>${esc(a.slice(i + 1).trim())}</span></li>`
      : `<li><span>${esc(a)}</span></li>`;
  }).join('');
  const details = paragraphs(pick(p, 'details'));
  const statusLabel = t('status.' + (p.status || 'completed'));

  box.innerHTML = `
  <section class="page-hero detail-hero">
    <p class="breadcrumb"><a href="index.html">${esc(t('nav.home'))}</a> / <a href="projeler.html">${esc(t('nav.projects'))}</a> / <span style="color: var(--text)">${esc(title)}</span></p>
    <p class="kicker">${esc(upper(catLabel(p.category)))}${p.year ? ' · ' + esc(p.year) : ''}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${p.featured ? `<span class="badge-featured">${esc(t('featured'))}</span>` : ''}
      ${p.status === 'in_progress' ? `<span class="badge-progress">${esc(t('inProgress'))}</span>` : ''}
    </div>
    <h1>${esc(title)}</h1>
    <p class="lead">${esc(pick(p, 'description'))}</p>
    <div class="project-links">
      ${gh ? `<a class="btn btn-primary" href="${esc(gh)}" target="_blank" rel="noopener">${esc(t('github'))}</a>` : ''}
      ${demo ? `<a class="btn" href="${esc(demo)}" target="_blank" rel="noopener">${esc(t('liveDemo'))}</a>` : ''}
      <a class="btn" href="projeler.html">${esc(t('project.back'))}</a>
    </div>
  </section>

  <div class="detail-grid">
    <div class="detail-main">
      ${details ? `<section class="detail-block"><h2>${esc(t('project.about'))}</h2><div class="prose">${details}</div></section>` : ''}
      ${features ? `<section class="detail-block"><h2>${esc(t('project.features'))}</h2><ul class="checklist">${features}</ul></section>` : ''}
      ${arch ? `<section class="detail-block"><h2>${esc(t('project.architecture'))}</h2><ul class="arch-list">${arch}</ul></section>` : ''}
      ${p.code_snippet ? `<section class="detail-block"><h2>${esc(t('project.code'))}</h2><pre class="code-block">${esc(p.code_snippet)}</pre></section>` : ''}
    </div>
    <aside class="detail-side">
      <div class="side-card">
        <dl class="meta">
          <div><dt>${esc(t('project.category'))}</dt><dd>${esc(catLabel(p.category))}</dd></div>
          ${p.year ? `<div><dt>${esc(t('project.year'))}</dt><dd>${esc(p.year)}</dd></div>` : ''}
          <div><dt>${esc(t('project.status'))}</dt><dd>${esc(statusLabel)}</dd></div>
        </dl>
      </div>
      <div class="side-card">
        <h2>${esc(t('project.stack'))}</h2>
        <div class="chips">${techChips(p.tech)}</div>
      </div>
    </aside>
  </div>`;

  $('#others').innerHTML = state.others.slice(0, 3).map(projectCardSmall).join('');
  $('#others-wrap').hidden = state.others.length === 0;
}

async function load() {
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
  const [profile, res] = await Promise.all([
    getProfile(),
    supabase.from('projects').select('*').eq('visible', true).order('sort_order').order('id')
  ]);
  state.profile = profile;
  applyProfile(profile);
  const all = res.data || [];
  state.project = valid ? all.find((p) => p.slug === slug) || null : null;
  state.notFound = !state.project;
  state.others = all.filter((p) => p !== state.project);
  render();
}

initPage();
window.addEventListener('langchange', () => { applyProfile(state.profile); render(); });
load();
