// =========================================================
// Tema: Sistem / Açık / Koyu
// - Tercih localStorage'da ('theme'), varsayılan: sistem
// - "Sistem" seçiliyken cihaz teması değişirse site de anında değişir
// =========================================================
const ORDER = ['system', 'light', 'dark'];
const LABELS = {
  tr: { system: 'Sistem teması', light: 'Açık tema', dark: 'Koyu tema', hint: 'Temayı değiştir' },
  en: { system: 'System theme', light: 'Light theme', dark: 'Dark theme', hint: 'Change theme' }
};
const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function readPref() {
  try {
    const v = localStorage.getItem('theme');
    if (ORDER.includes(v)) return v;
  } catch (_) { /* yok say */ }
  return 'system';
}

function resolve(pref) {
  if (pref === 'light' || pref === 'dark') return pref;
  return media && media.matches ? 'dark' : 'light';
}

function uiLang() { return document.documentElement.lang === 'en' ? 'en' : 'tr'; }

function apply(pref) {
  const root = document.documentElement;
  const mode = resolve(pref);
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-theme-pref', pref);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', mode === 'dark' ? '#0d1117' : '#ffffff');
  const L = LABELS[uiLang()];
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    // Ekran okuyucu: şu anki tercih + ne işe yaradığı
    btn.setAttribute('aria-label', `${L[pref]} — ${L.hint}`);
    btn.setAttribute('title', `${L[pref]} — ${L.hint}`);
  });
}

export function initTheme() {
  let pref = readPref();
  apply(pref);
  document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      pref = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
      try { localStorage.setItem('theme', pref); } catch (_) { /* yok say */ }
      apply(pref);
    });
  });
  if (media) {
    const onChange = () => { if (pref === 'system') apply(pref); };
    if (media.addEventListener) media.addEventListener('change', onChange); else media.addListener(onChange);
  }
  // Dil değişince düğme etiketini güncelle
  window.addEventListener('langchange', () => apply(pref));
}
