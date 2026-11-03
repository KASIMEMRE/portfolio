import { supabase, esc, mailtoUrl, $, $all, toast, CATEGORY_LABELS, GROUP_LABELS } from './common.js';

// Clickjacking koruması: panel başka bir sitenin iframe'i içinde açılırsa çalışmaz.
if (window.top !== window.self) {
  document.body.textContent = 'Bu sayfa güvenlik nedeniyle çerçeve içinde açılamaz.';
  throw new Error('framed');
}

const state = {
  section: 'overview',
  projects: [],
  skills: [],
  journey: [],
  messages: [],
  profile: null,
  editing: { projects: null, skills: null, journey: null },
  selectedMsg: null
};

const view = $('#view');
const show = (id) => ['login-view', 'denied-view', 'app-view'].forEach((v) => { $('#' + v).hidden = v !== id; });

/* =========================================================
   Kimlik doğrulama
   ========================================================= */
async function checkAccess(session) {
  if (!session) { show('login-view'); return; }
  const { data, error } = await supabase.from('admins').select('email').limit(1);
  if (error || !data || data.length === 0) { show('denied-view'); return; }
  show('app-view');
  await loadAll();
  const fromHash = location.hash.replace('#', '');
  go(['overview', 'projects', 'skills', 'journey', 'messages', 'profile'].includes(fromHash) ? fromHash : 'overview', false);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.hidden = true;
  const email = $('#l-email').value.trim();
  const password = $('#l-pass').value;
  if (!email || !password) { err.textContent = 'E-posta ve şifre gerekli.'; err.hidden = false; return; }
  const waitMs = loginLockedUntil - Date.now();
  if (waitMs > 0) { err.textContent = `Çok fazla hatalı deneme. ${Math.ceil(waitMs / 1000)} saniye sonra tekrar dene.`; err.hidden = false; return; }
  const btn = e.submitter || $('#login-form button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Giriş yapılıyor…';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Giriş yap';
  $('#l-pass').value = '';
  if (error) {
    failedLogins += 1;
    // Her 5 hatalı denemede artan bekleme süresi (sunucudaki Supabase sınırına ek olarak)
    if (failedLogins % 5 === 0) loginLockedUntil = Date.now() + Math.min(300, 30 * (failedLogins / 5)) * 1000;
    err.textContent = 'Giriş başarısız: e-posta veya şifre hatalı.';
    err.hidden = false;
  } else {
    failedLogins = 0;
  }
});

let failedLogins = 0;
let loginLockedUntil = 0;

/* Hareketsizlikte otomatik çıkış (30 dk) */
const IDLE_LIMIT = 30 * 60 * 1000;
let lastActivity = Date.now();
['click', 'keydown', 'pointermove', 'scroll'].forEach((ev) => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
setInterval(async () => {
  if (!$('#app-view').hidden && Date.now() - lastActivity > IDLE_LIMIT) {
    await supabase.auth.signOut();
    show('login-view');
    const err = $('#login-error');
    err.textContent = 'Uzun süre işlem yapılmadığı için güvenli çıkış yapıldı.';
    err.hidden = false;
  }
}, 60 * 1000);

document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-action="logout"]')) {
    await supabase.auth.signOut();
    show('login-view');
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
    // Supabase çağrılarını callback dışına ertele (kilitlenmeyi önler)
    setTimeout(() => checkAccess(session), 0);
  }
});

/* =========================================================
   Veri
   ========================================================= */
async function loadAll() {
  const [p, s, j, m, pr] = await Promise.all([
    supabase.from('projects').select('*').order('sort_order').order('id'),
    supabase.from('skills').select('*').order('group_name').order('sort_order').order('id'),
    supabase.from('journey').select('*').order('sort_order').order('id'),
    supabase.from('messages').select('*').order('created_at', { ascending: false }),
    supabase.from('profile').select('*').eq('id', 1).maybeSingle()
  ]);
  const firstErr = [p, s, j, m, pr].find((r) => r.error);
  if (firstErr) { console.error(firstErr.error); toast('Veriler yüklenirken hata oluştu', true); }
  state.projects = p.data || [];
  state.skills = s.data || [];
  state.journey = j.data || [];
  state.messages = m.data || [];
  state.profile = pr.data;
  if (state.profile) {
    const initials = state.profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr');
    $('#avatar').textContent = initials || 'KE';
  }
  updateCounts();
}

function updateCounts() {
  const set = (k, v, hot = false) => { const el = $(`[data-count="${k}"]`); el.textContent = v; el.classList.toggle('hot', hot); };
  set('projects', state.projects.length);
  set('skills', state.skills.length);
  set('journey', state.journey.length);
  const unread = state.messages.filter((m) => !m.is_read).length;
  set('messages', unread ? `${unread} yeni` : state.messages.length, unread > 0);
}

async function run(promise, okMsg) {
  const { error } = await promise;
  if (error) { console.error(error); toast('İşlem başarısız: ' + (error.message || 'bilinmeyen hata'), true); return false; }
  if (okMsg) toast(okMsg);
  return true;
}

/** Listeyi yeni sıraya göre kaydeder (sort_order = 1..n). */
async function saveOrder(table, list) {
  const changed = list.map((row, i) => ({ row, order: i + 1 })).filter(({ row, order }) => row.sort_order !== order);
  const results = await Promise.all(changed.map(({ row, order }) => supabase.from(table).update({ sort_order: order }).eq('id', row.id)));
  const failed = results.find((r) => r.error);
  if (failed) { toast('Sıralama kaydedilemedi', true); return false; }
  changed.forEach(({ row, order }) => { row.sort_order = order; });
  toast('Sıralama güncellendi');
  return true;
}

function moveIn(list, id, dir) {
  const i = list.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return null;
  const copy = list.slice();
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

const splitList = (text, sep) => String(text || '').split(sep).map((s) => s.trim()).filter(Boolean);
const fmtDate = (iso) => new Date(iso).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function validUrl(v) { return !v || /^https:\/\/[^\s<>"']+$/i.test(v); }

/* =========================================================
   Gezinme
   ========================================================= */
function go(section, focus = true) {
  state.section = section;
  history.replaceState(null, '', '#' + section);
  $all('#admin-nav [data-section]').forEach((b) => {
    if (b.dataset.section === section) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  render();
  if (focus) view.focus({ preventScroll: true });
}

$('#admin-nav').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-section]');
  if (btn) go(btn.dataset.section);
});

function render() {
  const fn = { overview: renderOverview, projects: renderProjects, skills: renderSkills, journey: renderJourney, messages: renderMessages, profile: renderProfile }[state.section];
  view.innerHTML = fn();
  if (state.section === 'profile') bindProfilePreview();
}

/* =========================================================
   Genel bakış
   ========================================================= */
function renderOverview() {
  const visible = state.projects.filter((p) => p.visible).length;
  const featured = state.projects.filter((p) => p.featured).length;
  const unread = state.messages.filter((m) => !m.is_read).length;
  const name = state.profile ? state.profile.name.split(/\s+/).slice(0, 2).join(' ') : '';
  const recent = state.messages.slice(0, 4).map((m) => `
    <button type="button" class="${m.is_read ? '' : 'unread'}" data-open-msg="${m.id}">
      <span class="dot"></span>
      <span class="meta"><span class="from">${esc(m.name)}</span><span class="preview">${esc(m.body)}</span><span class="date">${esc(fmtDate(m.created_at))}</span></span>
    </button>`).join('');
  return `
    <div class="admin-title"><div><h1>Hoş geldin${name ? ', ' + esc(name) : ''}</h1><p>Sitenin genel durumu ve hızlı işlemler.</p></div></div>
    <div class="tiles">
      <div class="tile"><p>Yayındaki projeler</p><strong>${visible}<span class="muted" style="font-size:16px"> / ${state.projects.length}</span></strong></div>
      <div class="tile"><p>Öne çıkan</p><strong style="color:var(--yellow)">${featured}</strong></div>
      <div class="tile"><p>Yetenekler</p><strong>${state.skills.length}</strong></div>
      <div class="tile"><p>Okunmamış mesaj</p><strong style="color:var(--accent)">${unread}</strong></div>
    </div>
    <div class="split">
      <section class="panel">
        <div class="panel-head"><h2>Son mesajlar</h2><button type="button" class="btn btn-sm" data-go="messages">Tümü →</button></div>
        <div class="inbox-list">${recent || '<p class="empty-row">Gelen kutun boş.</p>'}</div>
      </section>
      <section class="panel form-panel">
        <div class="panel-head"><h2>Hızlı işlemler</h2></div>
        <div class="panel-body">
          <button type="button" class="btn btn-green" data-go="projects" data-new="1">+ Yeni proje ekle</button>
          <button type="button" class="btn" data-go="skills" data-new="1">+ Yetenek ekle</button>
          <button type="button" class="btn" data-go="profile">Profil ve bio'yu düzenle</button>
          <a class="btn" href="index.html" target="_blank" rel="noopener">Siteyi yeni sekmede aç ↗</a>
        </div>
      </section>
    </div>`;
}

/* =========================================================
   Projeler
   ========================================================= */
function projectForm(p) {
  const v = p || { title: '', title_en: '', slug: '', category: 'api', status: 'completed', year: '', description: '', description_en: '', features: [], features_en: [], details: '', details_en: '', architecture: [], architecture_en: [], tech: [], github_url: '', demo_url: '', code_snippet: '', featured: false, visible: true };
  const cats = Object.entries(CATEGORY_LABELS).map(([k, l]) => `<option value="${k}" ${v.category === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const statuses = [['completed', 'Tamamlandı'], ['in_progress', 'Geliştiriliyor']].map(([k, l]) => `<option value="${k}" ${v.status === k ? 'selected' : ''}>${l}</option>`).join('');
  const lines = (a) => esc((a || []).join('\n'));
  return `
  <section class="panel form-panel" id="project-form-panel">
    <div class="panel-head"><h2>${p ? 'Projeyi düzenle: ' + esc(p.title) : 'Yeni proje'}</h2>${p ? '<button type="button" class="btn btn-sm" data-action="cancel-edit" data-table="projects">Vazgeç</button>' : ''}</div>
    <form class="panel-body" id="project-form" novalidate>
      <h3 class="form-section">Genel</h3>
      <div class="form-grid">
        <label class="field" for="f-title">Proje adı (TR) *<input id="f-title" name="title" required maxlength="120" value="${esc(v.title)}"></label>
        <label class="field" for="f-title-en">Project name (EN)<span class="hint">Boşsa Türkçe ad kullanılır</span><input id="f-title-en" name="title_en" maxlength="120" value="${esc(v.title_en)}"></label>
        <label class="field" for="f-slug">Bağlantı adı (slug)<span class="hint">proje.html?p=… · boşsa addan üretilir</span><input id="f-slug" name="slug" maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(v.slug || '')}"></label>
        <label class="field" for="f-category">Kategori<select id="f-category" name="category">${cats}</select></label>
        <label class="field" for="f-status">Durum<select id="f-status" name="status">${statuses}</select></label>
        <label class="field" for="f-year">Yıl<input id="f-year" name="year" maxlength="20" placeholder="2026" value="${esc(v.year)}"></label>
        <label class="field" for="f-tech">Teknolojiler<span class="hint">Virgülle ayır: .NET 10, EF Core</span><input id="f-tech" name="tech" value="${esc((v.tech || []).join(', '))}"></label>
        <label class="field" for="f-github">GitHub bağlantısı<input id="f-github" name="github_url" type="url" placeholder="https://github.com/KASIMEMRE/..." value="${esc(v.github_url)}"></label>
        <label class="field" for="f-demo">Canlı demo bağlantısı<input id="f-demo" name="demo_url" type="url" placeholder="https://..." value="${esc(v.demo_url)}"></label>
      </div>

      <h3 class="form-section">Türkçe içerik</h3>
      <div class="form-grid">
        <label class="field full" for="f-desc">Kısa açıklama (kartlarda görünür)<textarea id="f-desc" name="description" rows="2" maxlength="1000">${esc(v.description)}</textarea></label>
        <label class="field full" for="f-details">Detaylı açıklama (proje sayfası)<span class="hint">Paragrafları boş satırla ayır</span><textarea id="f-details" name="details" rows="7" maxlength="8000">${esc(v.details)}</textarea></label>
        <label class="field" for="f-features">Öne çıkan özellikler<span class="hint">Her satıra bir özellik</span><textarea id="f-features" name="features" rows="5">${lines(v.features)}</textarea></label>
        <label class="field" for="f-arch">Mimari / katmanlar<span class="hint">Her satıra bir katman — "Katman: açıklama"</span><textarea id="f-arch" name="architecture" rows="5">${lines(v.architecture)}</textarea></label>
      </div>

      <h3 class="form-section">English content <span class="hint">(boş bırakılan alanlarda Türkçe gösterilir)</span></h3>
      <div class="form-grid">
        <label class="field full" for="f-desc-en">Short description<textarea id="f-desc-en" name="description_en" rows="2" maxlength="1000">${esc(v.description_en)}</textarea></label>
        <label class="field full" for="f-details-en">Detailed description<span class="hint">Separate paragraphs with a blank line</span><textarea id="f-details-en" name="details_en" rows="7" maxlength="8000">${esc(v.details_en)}</textarea></label>
        <label class="field" for="f-features-en">Key features<span class="hint">One per line</span><textarea id="f-features-en" name="features_en" rows="5">${lines(v.features_en)}</textarea></label>
        <label class="field" for="f-arch-en">Architecture / layers<span class="hint">One per line — "Layer: description"</span><textarea id="f-arch-en" name="architecture_en" rows="5">${lines(v.architecture_en)}</textarea></label>
      </div>

      <h3 class="form-section">Kod parçası</h3>
      <label class="field" for="f-code">Öne çıkan kartta ve proje sayfasında gösterilir<textarea id="f-code" name="code_snippet" class="code" rows="8" maxlength="4000">${esc(v.code_snippet)}</textarea></label>

      <div style="display:flex;gap:20px;flex-wrap:wrap">
        <label class="check" for="f-featured"><input id="f-featured" name="featured" type="checkbox" ${v.featured ? 'checked' : ''}>Ana sayfada öne çıkar</label>
        <label class="check" for="f-visible"><input id="f-visible" name="visible" type="checkbox" ${v.visible ? 'checked' : ''}>Sitede yayınla</label>
      </div>
      <p class="form-error" id="project-error" role="alert" hidden></p>
      <div class="form-actions">
        <button type="submit" class="btn btn-green">${p ? 'Değişiklikleri kaydet' : 'Projeyi ekle'}</button>
        ${p && p.slug ? `<a class="btn" href="proje.html?p=${esc(p.slug)}" target="_blank" rel="noopener">Sayfayı görüntüle ↗</a>` : ''}
      </div>
    </form>
  </section>`;
}

function renderProjects() {
  const editing = state.projects.find((p) => p.id === state.editing.projects) || null;
  const rows = state.projects.map((p, i) => `
    <div class="row row-projects">
      <span class="order-btns"><button type="button" data-move="projects" data-id="${p.id}" data-dir="-1" aria-label="${esc(p.title)} yukarı taşı" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="projects" data-id="${p.id}" data-dir="1" aria-label="${esc(p.title)} aşağı taşı" ${i === state.projects.length - 1 ? 'disabled' : ''}>↓</button></span>
      <span><span class="title">${esc(p.title)}</span><span class="sub">${esc(CATEGORY_LABELS[p.category] || '')}</span></span>
      <span class="sub">${esc((p.tech || []).join(' · '))}</span>
      <span><span class="pill ${p.visible ? 'on' : ''}">${p.visible ? 'Yayında' : 'Gizli'}</span></span>
      <span class="actions">
        <button type="button" class="icon-btn star" data-toggle="featured" data-id="${p.id}" aria-pressed="${p.featured}" aria-label="${esc(p.title)} ${p.featured ? 'öne çıkarmayı kaldır' : 'öne çıkar'}">★</button>
        <button type="button" class="btn btn-sm" data-toggle="visible" data-id="${p.id}">${p.visible ? 'Gizle' : 'Yayınla'}</button>
        <button type="button" class="btn btn-sm" data-edit="projects" data-id="${p.id}">Düzenle</button>
        <button type="button" class="btn btn-sm btn-danger" data-delete="projects" data-id="${p.id}" aria-label="${esc(p.title)} projesini sil">Sil</button>
      </span>
    </div>`).join('');
  return `
    <div class="admin-title"><div><h1>Projeler</h1><p>Oklarla sırala, yıldızla ana sayfada öne çıkar, gizle ya da düzenle.</p></div></div>
    <section class="panel" aria-label="Proje listesi">
      <div class="rows">
        <div class="row row-projects head"><span>Sıra</span><span>Proje</span><span>Teknolojiler</span><span>Durum</span><span style="text-align:right">İşlemler</span></div>
        ${rows || '<p class="empty-row">Henüz proje yok.</p>'}
      </div>
    </section>
    ${projectForm(editing)}`;
}

async function submitProject(form) {
  const fd = new FormData(form);
  const err = $('#project-error');
  const str = (k) => String(fd.get(k) || '').trim();
  const data = {
    title: str('title'),
    title_en: str('title_en'),
    slug: str('slug').toLowerCase() || slugify(str('title')),
    category: str('category'),
    status: str('status') || 'completed',
    year: str('year'),
    description: str('description'),
    description_en: str('description_en'),
    details: str('details'),
    details_en: str('details_en'),
    features: splitList(fd.get('features'), /\n/),
    features_en: splitList(fd.get('features_en'), /\n/),
    architecture: splitList(fd.get('architecture'), /\n/),
    architecture_en: splitList(fd.get('architecture_en'), /\n/),
    tech: splitList(fd.get('tech'), ','),
    github_url: str('github_url'),
    demo_url: str('demo_url'),
    code_snippet: String(fd.get('code_snippet') || '').replace(/\s+$/, ''),
    featured: fd.get('featured') === 'on',
    visible: fd.get('visible') === 'on'
  };
  const fail = (m) => { err.textContent = m; err.hidden = false; };
  if (!data.title) return fail('Proje adı boş olamaz.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) return fail('Bağlantı adı yalnızca küçük harf, rakam ve tire içerebilir (ör. cinemabooking-api).');
  if (state.projects.some((x) => x.slug === data.slug && x.id !== state.editing.projects)) return fail('Bu bağlantı adı başka bir projede kullanılıyor.');
  if (!validUrl(data.github_url) || !validUrl(data.demo_url)) return fail('Bağlantılar https:// ile başlamalı.');
  const id = state.editing.projects;
  let ok;
  if (id) ok = await run(supabase.from('projects').update(data).eq('id', id), 'Proje güncellendi');
  else ok = await run(supabase.from('projects').insert({ ...data, sort_order: state.projects.length + 1 }), 'Proje eklendi');
  if (!ok) return;
  state.editing.projects = null;
  await reload('projects');
}

/** Türkçe karakterleri dönüştürerek URL dostu ad üretir. */
function slugify(text) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
  return String(text).toLocaleLowerCase('tr').replace(/[çğıiöşü]/g, (c) => map[c] || c)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

/* =========================================================
   Yetenekler
   ========================================================= */
function skillForm(s) {
  const v = s || { name: '', name_en: '', abbr: '', group_name: 'backend', description: '', description_en: '', used_in: [], visible: true };
  const groups = Object.entries(GROUP_LABELS).map(([k, l]) => `<option value="${k}" ${v.group_name === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const projectNames = state.projects.map((p) => esc(p.title)).join(', ');
  return `
  <section class="panel form-panel">
    <div class="panel-head"><h2>${s ? 'Yeteneği düzenle: ' + esc(s.name) : 'Yeni yetenek'}</h2>${s ? '<button type="button" class="btn btn-sm" data-action="cancel-edit" data-table="skills">Vazgeç</button>' : ''}</div>
    <form class="panel-body" id="skill-form" novalidate>
      <div class="form-grid">
        <label class="field" for="s-name">Ad *<input id="s-name" name="name" required maxlength="80" value="${esc(v.name)}"></label>
        <label class="field" for="s-abbr">Kısaltma (ikon)<span class="hint">2–3 harf, ör. EF</span><input id="s-abbr" name="abbr" maxlength="4" value="${esc(v.abbr)}"></label>
        <label class="field" for="s-group">Alan<select id="s-group" name="group_name">${groups}</select></label>
        <label class="field" for="s-name-en">Name (EN)<span class="hint">Boşsa Türkçe ad kullanılır</span><input id="s-name-en" name="name_en" maxlength="80" value="${esc(v.name_en)}"></label>
        <label class="field full" for="s-desc">Açıklama (TR)<textarea id="s-desc" name="description" rows="2" maxlength="500">${esc(v.description)}</textarea></label>
        <label class="field full" for="s-desc-en">Description (EN)<textarea id="s-desc-en" name="description_en" rows="2" maxlength="500">${esc(v.description_en)}</textarea></label>
        <label class="field full" for="s-used">Kullandığım yerler<span class="hint">Virgülle ayır. Mevcut projeler: ${projectNames}</span><input id="s-used" name="used_in" value="${esc((v.used_in || []).join(', '))}"></label>
      </div>
      <label class="check" for="s-visible"><input id="s-visible" name="visible" type="checkbox" ${v.visible ? 'checked' : ''}>Sitede göster</label>
      <p class="form-error" id="skill-error" role="alert" hidden></p>
      <div class="form-actions"><button type="submit" class="btn btn-green">${s ? 'Değişiklikleri kaydet' : 'Yetenek ekle'}</button></div>
    </form>
  </section>`;
}

function renderSkills() {
  const editing = state.skills.find((s) => s.id === state.editing.skills) || null;
  const groups = Object.keys(GROUP_LABELS);
  const rows = groups.map((g) => {
    const items = state.skills.filter((s) => s.group_name === g);
    if (!items.length) return '';
    return `<div class="row head" style="grid-template-columns:1fr;background:var(--bg-deep)"><span>${esc(GROUP_LABELS[g])} · ${items.length}</span></div>` +
      items.map((s, i) => `
      <div class="row row-skills">
        <span class="order-btns"><button type="button" data-move="skills" data-id="${s.id}" data-dir="-1" aria-label="${esc(s.name)} yukarı taşı" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="skills" data-id="${s.id}" data-dir="1" aria-label="${esc(s.name)} aşağı taşı" ${i === items.length - 1 ? 'disabled' : ''}>↓</button></span>
        <span><span class="title">${esc(s.name)}</span>${s.visible ? '' : ' <span class="pill">Gizli</span>'}</span>
        <span class="sub">${esc(GROUP_LABELS[s.group_name] || '')}</span>
        <span class="sub">${esc((s.used_in || []).join(', '))}</span>
        <span class="actions">
          <button type="button" class="btn btn-sm" data-edit="skills" data-id="${s.id}">Düzenle</button>
          <button type="button" class="btn btn-sm btn-danger" data-delete="skills" data-id="${s.id}" aria-label="${esc(s.name)} yeteneğini sil">Sil</button>
        </span>
      </div>`).join('');
  }).join('');
  return `
    <div class="admin-title"><div><h1>Yetenekler</h1><p>Yetenekler sayfasındaki kartları ve ana sayfadaki “Araç kutum” bölümünü yönetir.</p></div></div>
    <section class="panel" aria-label="Yetenek listesi"><div class="rows">${rows || '<p class="empty-row">Henüz yetenek yok.</p>'}</div></section>
    ${skillForm(editing)}`;
}

async function submitSkill(form) {
  const fd = new FormData(form);
  const err = $('#skill-error');
  const data = {
    name: String(fd.get('name')).trim(),
    name_en: String(fd.get('name_en') || '').trim(),
    description_en: String(fd.get('description_en') || '').trim(),
    abbr: String(fd.get('abbr')).trim(),
    group_name: String(fd.get('group_name')),
    description: String(fd.get('description')).trim(),
    used_in: splitList(fd.get('used_in'), ','),
    visible: fd.get('visible') === 'on'
  };
  if (!data.name) { err.textContent = 'Yetenek adı boş olamaz.'; err.hidden = false; return; }
  if (!data.abbr) data.abbr = data.name.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü0-9#]/g, '').slice(0, 3).toLocaleUpperCase('tr');
  const id = state.editing.skills;
  let ok;
  if (id) ok = await run(supabase.from('skills').update(data).eq('id', id), 'Yetenek güncellendi');
  else {
    const inGroup = state.skills.filter((s) => s.group_name === data.group_name).length;
    ok = await run(supabase.from('skills').insert({ ...data, sort_order: inGroup + 1 }), 'Yetenek eklendi');
  }
  if (!ok) return;
  state.editing.skills = null;
  await reload('skills');
}

/* =========================================================
   Yolculuk
   ========================================================= */
function renderJourney() {
  const editing = state.journey.find((j) => j.id === state.editing.journey) || null;
  const v = editing || { period: '', title: '', subtitle: '', period_en: '', title_en: '', subtitle_en: '' };
  const rows = state.journey.map((j, i) => `
    <div class="row row-journey">
      <span class="order-btns"><button type="button" data-move="journey" data-id="${j.id}" data-dir="-1" aria-label="${esc(j.title)} yukarı taşı" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-move="journey" data-id="${j.id}" data-dir="1" aria-label="${esc(j.title)} aşağı taşı" ${i === state.journey.length - 1 ? 'disabled' : ''}>↓</button></span>
      <span class="sub mono">${esc(j.period)}</span>
      <span><span class="title">${esc(j.title)}</span><span class="sub">${esc(j.subtitle)}</span></span>
      <span class="actions">
        <button type="button" class="btn btn-sm" data-edit="journey" data-id="${j.id}">Düzenle</button>
        <button type="button" class="btn btn-sm btn-danger" data-delete="journey" data-id="${j.id}" aria-label="${esc(j.title)} kaydını sil">Sil</button>
      </span>
    </div>`).join('');
  return `
    <div class="admin-title"><div><h1>Yolculuk</h1><p>Ana sayfadaki zaman çizelgesi. En üstteki kayıt vurgulu gösterilir.</p></div></div>
    <section class="panel" aria-label="Zaman çizelgesi"><div class="rows">${rows || '<p class="empty-row">Henüz kayıt yok.</p>'}</div></section>
    <section class="panel form-panel">
      <div class="panel-head"><h2>${editing ? 'Kaydı düzenle' : 'Yeni kayıt'}</h2>${editing ? '<button type="button" class="btn btn-sm" data-action="cancel-edit" data-table="journey">Vazgeç</button>' : ''}</div>
      <form class="panel-body" id="journey-form" novalidate>
        <div class="form-grid">
          <label class="field" for="j-period">Dönem<span class="hint">ör. 2024 – DEVAM EDİYOR</span><input id="j-period" name="period" maxlength="60" value="${esc(v.period)}"></label>
          <label class="field" for="j-title">Başlık *<input id="j-title" name="title" required maxlength="120" value="${esc(v.title)}"></label>
          <label class="field full" for="j-sub">Alt başlık<input id="j-sub" name="subtitle" maxlength="200" value="${esc(v.subtitle)}"></label>
          <label class="field" for="j-period-en">Period (EN)<input id="j-period-en" name="period_en" maxlength="60" value="${esc(v.period_en)}"></label>
          <label class="field" for="j-title-en">Title (EN)<input id="j-title-en" name="title_en" maxlength="120" value="${esc(v.title_en)}"></label>
          <label class="field full" for="j-sub-en">Subtitle (EN)<input id="j-sub-en" name="subtitle_en" maxlength="200" value="${esc(v.subtitle_en)}"></label>
        </div>
        <p class="form-error" id="journey-error" role="alert" hidden></p>
        <div class="form-actions"><button type="submit" class="btn btn-green">${editing ? 'Kaydet' : 'Ekle'}</button></div>
      </form>
    </section>`;
}

async function submitJourney(form) {
  const fd = new FormData(form);
  const data = {};
  ['period', 'title', 'subtitle', 'period_en', 'title_en', 'subtitle_en'].forEach((k) => { data[k] = String(fd.get(k) || '').trim(); });
  if (!data.title) { const err = $('#journey-error'); err.textContent = 'Başlık boş olamaz.'; err.hidden = false; return; }
  const id = state.editing.journey;
  const ok = id
    ? await run(supabase.from('journey').update(data).eq('id', id), 'Kayıt güncellendi')
    : await run(supabase.from('journey').insert({ ...data, sort_order: state.journey.length + 1 }), 'Kayıt eklendi');
  if (!ok) return;
  state.editing.journey = null;
  await reload('journey');
}

/* =========================================================
   Mesajlar
   ========================================================= */
function renderMessages() {
  const list = state.messages.map((m) => `
    <button type="button" class="${m.is_read ? '' : 'unread'}" data-open-msg="${m.id}" aria-current="${state.selectedMsg === m.id}">
      <span class="dot"></span>
      <span class="meta"><span class="from">${esc(m.name)}</span><span class="preview">${esc(m.body)}</span><span class="date">${esc(fmtDate(m.created_at))}</span></span>
    </button>`).join('');
  const sel = state.messages.find((m) => m.id === state.selectedMsg);
  const mail = sel ? mailtoUrl(sel.email, 'Re: Portfolyo mesajın') : '';
  const detail = sel ? `
    <div class="panel-body">
      <div><h2 style="font:700 20px var(--font-display)">${esc(sel.name)}</h2><p class="muted" style="font-size:13px">${esc(sel.email)} · ${esc(fmtDate(sel.created_at))}</p></div>
      <p class="body">${esc(sel.body)}</p>
      <div class="form-actions">
        ${mail ? `<a class="btn btn-primary" href="${esc(mail)}">Yanıtla</a>` : ''}
        <button type="button" class="btn" data-action="toggle-read" data-id="${sel.id}">${sel.is_read ? 'Okunmadı işaretle' : 'Okundu işaretle'}</button>
        <button type="button" class="btn btn-danger" data-delete="messages" data-id="${sel.id}">Sil</button>
      </div>
    </div>` : '<p class="empty-row">Okumak için bir mesaj seç.</p>';
  return `
    <div class="admin-title"><div><h1>Gelen mesajlar</h1><p>Ana sayfadaki iletişim formundan gelenler.</p></div><button type="button" class="btn btn-sm" data-action="refresh-messages">Yenile</button></div>
    <div class="inbox">
      <section class="panel inbox-list" aria-label="Mesaj listesi">${list || '<p class="empty-row">Gelen kutun boş.</p>'}</section>
      <section class="panel inbox-detail form-panel" aria-label="Mesaj içeriği" aria-live="polite">${detail}</section>
    </div>`;
}

async function openMessage(id) {
  state.selectedMsg = id;
  const m = state.messages.find((x) => x.id === id);
  if (m && !m.is_read) {
    const ok = await run(supabase.from('messages').update({ is_read: true }).eq('id', id));
    if (ok) m.is_read = true;
  }
  updateCounts();
  if (state.section !== 'messages') go('messages'); else render();
}

/* =========================================================
   Profil
   ========================================================= */
function renderProfile() {
  const p = state.profile || {};
  const f = (id, label, key, attrs = '') => `<label class="field" for="${id}">${label}<input id="${id}" name="${key}" value="${esc(p[key])}" ${attrs}></label>`;
  return `
    <div class="admin-title"><div><h1>Profil</h1><p>Yazdıkça sağdaki önizleme güncellenir. Bilgiler tüm sayfalarda kullanılır.</p></div></div>
    <div class="split">
      <section class="panel form-panel">
        <form class="panel-body" id="profile-form" novalidate>
          <div class="form-grid">
            ${f('p-name', 'Ad soyad *', 'name', 'required maxlength="80"')}
            ${f('p-title', 'Ünvan', 'title', 'maxlength="80"')}
            <label class="field full" for="p-bio">Kısa bio<textarea id="p-bio" name="bio" rows="4" maxlength="1000">${esc(p.bio)}</textarea></label>
            ${f('p-location', 'Konum', 'location', 'maxlength="80"')}
            ${f('p-email', 'İletişim e-postası', 'email', 'type="email" maxlength="200"')}
            ${f('p-github', 'GitHub', 'github_url', 'type="url"')}
            ${f('p-linkedin', 'LinkedIn', 'linkedin_url', 'type="url"')}
            ${f('p-instagram', 'Instagram', 'instagram_url', 'type="url"')}
            ${f('p-learning', 'Şu an öğreniyorum', 'learning', 'maxlength="80" placeholder="ör. Docker"')}
            ${f('p-goal', 'Sıradaki hedef', 'next_goal', 'maxlength="80" placeholder="ör. Mikroservis mimarisi"')}
          </div>
          <h3 class="form-section">English <span class="hint">(boş bırakılan alanlarda Türkçe gösterilir)</span></h3>
          <div class="form-grid">
            ${f('p-title-en', 'Title (EN)', 'title_en', 'maxlength="80"')}
            ${f('p-location-en', 'Location (EN)', 'location_en', 'maxlength="80"')}
            <label class="field full" for="p-bio-en">Short bio (EN)<textarea id="p-bio-en" name="bio_en" rows="4" maxlength="1000">${esc(p.bio_en)}</textarea></label>
            ${f('p-learning-en', 'Currently learning (EN)', 'learning_en', 'maxlength="80"')}
            ${f('p-goal-en', 'Next goal (EN)', 'next_goal_en', 'maxlength="80"')}
          </div>
          <label class="check" for="p-available"><input id="p-available" name="available" type="checkbox" ${p.available ? 'checked' : ''}>“Tekliflere açık” rozetini göster</label>
          <p class="form-error" id="profile-error" role="alert" hidden></p>
          <div class="form-actions"><button type="submit" class="btn btn-green">Kaydet</button></div>
        </form>
      </section>
      <section class="preview-card" aria-label="Canlı önizleme">
        <p class="mono muted" style="font-size:12px">ÖNİZLEME</p>
        <span class="badge-available" id="pv-available" ${p.available ? '' : 'hidden'}>Staj ve freelance tekliflerine açık</span>
        <p class="name" id="pv-name">${esc(p.name)}</p>
        <p class="title" id="pv-title">${esc(p.title)}</p>
        <p class="bio" id="pv-bio">${esc(p.bio)}</p>
        <p class="muted" id="pv-location" style="font-size:13px">${esc(p.location)}</p>
      </section>
    </div>`;
}

function bindProfilePreview() {
  const form = $('#profile-form');
  form.addEventListener('input', () => {
    $('#pv-name').textContent = $('#p-name').value;
    $('#pv-title').textContent = $('#p-title').value;
    $('#pv-bio').textContent = $('#p-bio').value;
    $('#pv-location').textContent = $('#p-location').value;
    $('#pv-available').hidden = !$('#p-available').checked;
  });
}

async function submitProfile(form) {
  const fd = new FormData(form);
  const err = $('#profile-error');
  const data = {};
  ['name', 'title', 'bio', 'location', 'email', 'github_url', 'linkedin_url', 'instagram_url', 'learning', 'next_goal', 'title_en', 'bio_en', 'location_en', 'learning_en', 'next_goal_en'].forEach((k) => { data[k] = String(fd.get(k) || '').trim(); });
  data.available = fd.get('available') === 'on';
  data.updated_at = new Date().toISOString();
  if (!data.name) { err.textContent = 'Ad soyad boş olamaz.'; err.hidden = false; return; }
  if (![data.github_url, data.linkedin_url, data.instagram_url].every(validUrl)) { err.textContent = 'Sosyal bağlantılar https:// ile başlamalı.'; err.hidden = false; return; }
  const ok = await run(supabase.from('profile').update(data).eq('id', 1), 'Profil kaydedildi');
  if (ok) state.profile = { ...state.profile, ...data };
}

/* =========================================================
   Ortak olay yönetimi
   ========================================================= */
async function reload(table) {
  const orders = { projects: [['sort_order'], ['id']], skills: [['group_name'], ['sort_order'], ['id']], journey: [['sort_order'], ['id']], messages: [['created_at', { ascending: false }]] };
  let q = supabase.from(table).select('*');
  orders[table].forEach(([col, opt]) => { q = q.order(col, opt); });
  const { data, error } = await q;
  if (error) { toast('Liste yenilenemedi', true); return; }
  state[table] = data || [];
  updateCounts();
  render();
}

view.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  ({ 'project-form': submitProject, 'skill-form': submitSkill, 'journey-form': submitJourney, 'profile-form': submitProfile })[form.id]?.(form);
});

view.addEventListener('click', async (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  const id = t.dataset.id ? Number(t.dataset.id) : null;

  if (t.dataset.go) {
    go(t.dataset.go);
    if (t.dataset.new) document.querySelector('.form-panel input')?.focus();
    return;
  }
  if (t.dataset.openMsg) { openMessage(Number(t.dataset.openMsg)); return; }

  if (t.dataset.edit) {
    state.editing[t.dataset.edit] = id;
    render();
    document.querySelector('.form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelector('.form-panel input')?.focus({ preventScroll: true });
    return;
  }
  if (t.dataset.action === 'cancel-edit') { state.editing[t.dataset.table] = null; render(); return; }
  if (t.dataset.action === 'refresh-messages') { await reload('messages'); toast('Mesajlar yenilendi'); return; }

  if (t.dataset.action === 'toggle-read') {
    const m = state.messages.find((x) => x.id === id);
    if (m && await run(supabase.from('messages').update({ is_read: !m.is_read }).eq('id', id), m.is_read ? 'Okunmadı olarak işaretlendi' : 'Okundu olarak işaretlendi')) {
      m.is_read = !m.is_read; updateCounts(); render();
    }
    return;
  }

  if (t.dataset.toggle) {
    const field = t.dataset.toggle;
    const p = state.projects.find((x) => x.id === id);
    if (!p) return;
    const msg = field === 'visible' ? (p.visible ? 'Proje gizlendi' : 'Proje yayınlandı') : (p.featured ? 'Öne çıkarma kaldırıldı' : 'Proje öne çıkarıldı');
    if (await run(supabase.from('projects').update({ [field]: !p[field] }).eq('id', id), msg)) { p[field] = !p[field]; render(); }
    return;
  }

  if (t.dataset.move) {
    const table = t.dataset.move;
    const dir = Number(t.dataset.dir);
    let list = state[table];
    if (table === 'skills') {
      const group = list.find((s) => s.id === id)?.group_name;
      list = list.filter((s) => s.group_name === group);
    }
    const moved = moveIn(list, id, dir);
    if (moved && await saveOrder(table, moved)) await reload(table);
    return;
  }

  if (t.dataset.delete) {
    const table = t.dataset.delete;
    const labels = { projects: 'Bu projeyi', skills: 'Bu yeteneği', journey: 'Bu kaydı', messages: 'Bu mesajı' };
    if (!window.confirm(`${labels[table]} kalıcı olarak silmek istediğine emin misin?`)) return;
    if (await run(supabase.from(table).delete().eq('id', id), 'Silindi')) {
      if (state.editing[table] === id) state.editing[table] = null;
      if (table === 'messages') state.selectedMsg = null;
      await reload(table);
    }
  }
});
