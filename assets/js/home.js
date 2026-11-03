import { supabase, esc, safeUrl, isEmail, $, $all, getProfile, applyProfile, initReveal, initPage, projectCardSmall, projectUrl, techChips, groupLabel } from './common.js';
import { t, pick } from './i18n.js';

const data = { profile: null, projects: [], skills: [], journey: [] };

/* ---------- Kod editörü sekmeleri ---------- */
function initTabs() {
  const tabs = $all('.editor-tab');
  const select = (tab) => {
    tabs.forEach((x) => {
      const on = x === tab;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  };
  tabs.forEach((x, i) => {
    x.addEventListener('click', () => select(x));
    x.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]);
      }
    });
  });
}

function renderHero(p) {
  if (!p) return;
  applyProfile(p);
  const parts = p.name.trim().split(/\s+/);
  const last = parts.pop();
  $('#hero-name').innerHTML = `${esc(parts.join(' '))}<br><span class="accent">${esc(last)}</span>`;
  const shortName = parts.length ? parts.join(' ') : last;
  $all('[data-code="name"]').forEach((el) => { el.textContent = shortName; });
  $all('[data-code="location"]').forEach((el) => { el.textContent = pick(p, 'location'); });
  const now = $('#now-working');
  const job = pick(p, 'job_title');
  if (p.company && job) {
    const url = safeUrl(p.company_url);
    const company = url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(p.company)}</a>` : `<strong>${esc(p.company)}</strong>`;
    now.innerHTML = `<span class="dot" aria-hidden="true"></span>${esc(t('hero.now'))} ${company} ${esc(t('hero.at'))} ${esc(job)}`;
    now.hidden = false;
  } else {
    now.hidden = true;
  }
}

function renderFeatured(p) {
  const box = $('#featured');
  if (!p) { box.innerHTML = ''; return; }
  const features = (pick(p, 'features') || []).map((f) => `<li>${esc(f)}</li>`).join('');
  const gh = safeUrl(p.github_url);
  box.innerHTML = `<article class="featured">
    <div class="featured-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <span class="badge-featured">${esc(t('featured'))}</span>
        ${p.status === 'in_progress' ? `<span class="badge-progress">${esc(t('inProgress'))}</span>` : ''}
      </div>
      <h3>${esc(pick(p, 'title'))}</h3>
      <p class="desc">${esc(pick(p, 'description'))}</p>
      ${features ? `<ul class="checklist">${features}</ul>` : ''}
      <div class="chips">${techChips(p.tech)}</div>
      <div class="project-links">
        <a class="btn btn-primary" href="${esc(projectUrl(p))}">${esc(t('details'))}</a>
        ${gh ? `<a class="btn" href="${esc(gh)}" target="_blank" rel="noopener">${esc(t('github'))}</a>` : ''}
      </div>
    </div>
    ${p.code_snippet ? `<pre class="featured-code" aria-label="${esc(t('project.code'))}">${esc(p.code_snippet)}</pre>` : ''}
  </article>`;
}

function renderSkills() {
  const groups = ['enterprise', 'backend', 'data', 'mobile', 'web'];
  let html = groups.map((g) => {
    const items = data.skills.filter((s) => s.group_name === g);
    if (!items.length) return '';
    return `<div class="skill-group"><h3>${esc(groupLabel(g))}</h3><div class="tags">${items.map((s) => `<span class="tag">${esc(pick(s, 'name'))}</span>`).join('')}</div></div>`;
  }).join('');
  const learning = pick(data.profile, 'learning');
  if (learning) html += `<div class="skill-group learning"><h3>${esc(t('learning'))}</h3><p style="color: var(--text-2)">${esc(learning)}</p></div>`;
  $('#skills-preview').innerHTML = html;
}

function renderTimeline() {
  $('#timeline').innerHTML = data.journey.map((j) => `<li>
    <p class="period">${esc(pick(j, 'period'))}</p>
    <p class="title">${esc(pick(j, 'title'))}</p>
    ${pick(j, 'subtitle') ? `<p class="sub">${esc(pick(j, 'subtitle'))}</p>` : ''}
  </li>`).join('');
}

function renderAll() {
  renderHero(data.profile);
  $('#stat-projects').textContent = data.projects.length;
  $('#stat-skills').textContent = data.skills.length;
  const featured = data.projects.find((p) => p.featured && p.code_snippet) || data.projects.find((p) => p.featured) || data.projects[0];
  renderFeatured(featured);
  $('#projects-preview').innerHTML = data.projects.filter((p) => p !== featured).slice(0, 3).map(projectCardSmall).join('');
  renderSkills();
  renderTimeline();
}

/* ---------- İletişim formu ---------- */
function initContact() {
  const form = $('#contact-form');
  const err = $('#form-error');
  const ok = $('#form-success');
  const showError = (msg) => { err.textContent = msg; err.hidden = false; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const fd = new FormData(form);
    if (fd.get('website')) return; // bot tuzağı
    const name = String(fd.get('name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const body = String(fd.get('body') || '').trim();
    if (!name || !email || !body) return showError(t('form.err.required'));
    if (!isEmail(email)) return showError(t('form.err.email'));
    if (name.length > 120 || body.length > 5000) return showError(t('form.err.long'));

    let last = 0;
    try { last = Number(localStorage.getItem('lastMessageAt') || 0); } catch (_) { /* yok say */ }
    if (Date.now() - last < 60_000) return showError(t('form.err.wait'));

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = t('form.sending');
    const { error } = await supabase.from('messages').insert({ name, email, body });
    btn.disabled = false; btn.textContent = t('form.send');
    if (error) return showError(error.code === 'P0001' ? t('form.err.rate') : t('form.err.generic'));

    try { localStorage.setItem('lastMessageAt', String(Date.now())); } catch (_) { /* yok say */ }
    form.reset();
    form.hidden = true;
    ok.hidden = false;
  });

  $('#again').addEventListener('click', () => { ok.hidden = true; form.hidden = false; $('#c-name').focus(); });
}

async function load() {
  const [profile, projectsRes, skillsRes, journeyRes] = await Promise.all([
    getProfile(),
    supabase.from('projects').select('*').eq('visible', true).order('sort_order').order('id'),
    supabase.from('skills').select('*').eq('visible', true).order('sort_order').order('id'),
    supabase.from('journey').select('*').order('sort_order').order('id')
  ]);
  data.profile = profile;
  data.projects = projectsRes.data || [];
  data.skills = skillsRes.data || [];
  data.journey = journeyRes.data || [];
  if (projectsRes.error || skillsRes.error) console.error(projectsRes.error || skillsRes.error);
  renderAll();
}

initPage();
initTabs();
initContact();
initReveal();
window.addEventListener('langchange', renderAll);
load();
