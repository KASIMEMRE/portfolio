// Sayfa çizilmeden önce temayı uygular (yanlış temanın bir anlığına görünmesini önler).
// Klasik (modül olmayan) betik olarak <head> içinde, CSS'ten önce yüklenir.
(function () {
  var pref = 'system';
  try {
    var saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') pref = saved;
  } catch (e) { /* yok say */ }
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-theme-pref', pref);
})();
