import { supabase, esc, safeUrl, $, $all, getProfile, applyProfile, initReveal, projectCardSmall, GROUP_LABELS } from './common.js';

/* ---------- Kod editörü sekmeleri ---------- */
function initTabs() {
  const tabs = $all('.editor-tab');
  const select = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    tab.focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next);
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
  $all('[data-code="title"]').forEach((el) => { el.textContent = p.title.replace(/geliştirici/i, '').trim() || p.title; });
  $all('[data-code="location"]').forEach((el) => { el.textContent = p.location; });
}

function renderFeatured(p) {
  const box = $('#featured');
  if (!p) { box.innerHTML = ''; return; }
  const features = (p.features || []).map((f) => `<li>${esc(f)}</li>`).join('');
  const tech = (p.tech || []).map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  const gh = safeUrl(p.github_url);
  const demo = safeUrl(p.demo_url);
  box.innerHTML = `<article class="featured">
    <div class="featured-body">
      <span class="badge-featured">ÖNE ÇIKAN</span>
      <h3>${esc(p.title)}</h3>
      <p class="desc">${esc(p.description)}</p>
      ${features ? `<ul class="checklist">${features}</ul>` : ''}
      <div class="chips">${tech}</div>
      <div class="project-links">
        ${gh ? `<a class="btn" href="${esc(gh)}" target="_blank" rel="noopener">Kodu incele →</a>` : ''}
        ${demo ? `<a class="btn btn-primary" href="${esc(demo)}" target="_blank" rel="noopener">Canlı demo ↗</a>` : ''}
      </div>
    </div>
    ${p.code_snippet ? `<pre class="featured-code" aria-label="Kod örneği">${esc(p.code_snippet)}</pre>` : ''}
  </article>`;
}

function renderSkills(skills, profile) {
  const groups = ['backend', 'data', 'web'];
  let html = groups.map((g) => {
    const items = skills.filter((s) => s.group_name === g);
    if (!items.length) return '';
    return `<div class="skill-group"><h3>${esc(GROUP_LABELS[g])}</h3><div class="tags">${items.map((s) => `<span class="tag">${esc(s.name)}</span>`).join('')}</div></div>`;
  }).join('');
  if (profile && profile.learning) {
    html += `<div class="skill-group learning"><h3>Şu an öğreniyorum</h3><p style="color: var(--text-2)">${esc(profile.learning)}</p></div>`;
  }
  $('#skills-preview').innerHTML = html;
}

function renderTimeline(items) {
  $('#timeline').innerHTML = items.map((j) => `<li>
    <p class="period">${esc(j.period)}</p>
    <p class="title">${esc(j.title)}</p>
    ${j.subtitle ? `<p class="sub">${esc(j.subtitle)}</p>` : ''}
  </li>`).join('');
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
    if (!name || !email || !body) return showError('Lütfen tüm alanları doldur.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError('Geçerli bir e-posta adresi gir.');

    let last = 0;
    try { last = Number(localStorage.getItem('lastMessageAt') || 0); } catch (_) { /* yok say */ }
    if (Date.now() - last < 60_000) return showError('Kısa süre önce mesaj gönderdin, lütfen bir dakika bekle.');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    const { error } = await supabase.from('messages').insert({ name, email, body });
    btn.disabled = false; btn.textContent = 'Mesajı gönder';
    if (error) { console.error(error); return showError('Mesaj gönderilemedi, lütfen tekrar dene.'); }

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

  renderHero(profile);

  const projects = projectsRes.data || [];
  const skills = skillsRes.data || [];
  $('#stat-projects').textContent = projects.length;
  $('#stat-skills').textContent = skills.length;

  const featured = projects.find((p) => p.featured && p.code_snippet) || projects.find((p) => p.featured) || projects[0];
  renderFeatured(featured);
  const rest = projects.filter((p) => p !== featured).slice(0, 3);
  $('#projects-preview').innerHTML = rest.map(projectCardSmall).join('');

  renderSkills(skills, profile);
  renderTimeline(journeyRes.data || []);

  if (projectsRes.error || skillsRes.error) console.error(projectsRes.error || skillsRes.error);
}

initTabs();
initContact();
initReveal();
load();
