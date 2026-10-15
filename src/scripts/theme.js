// Inlined in the head so the saved theme is applied before the first paint.
(() => {
 const root = document.documentElement;
 let themeColor = document.querySelector('meta[name="theme-color"]');
 const colorScheme = document.querySelector('meta[name="color-scheme"]');
 const systemTheme = matchMedia('(prefers-color-scheme: dark)');
 const preferredMode = () => systemTheme.matches ? 'dark' : 'light';
 let preference = null;
 const readPreference = () => {
  try {
   const saved = localStorage.getItem('color-mode');
   return saved === 'dark' || saved === 'light' ? saved : null;
  } catch { return preference; }
 };

 const syncButtons = () => {
  const dark = root.classList.contains('u-mode-invert');
  for (const button of document.querySelectorAll('[data-theme-toggle]')) {
   const label = (dark ? button.dataset.labelLight : button.dataset.labelDark) ?? '';
   button.setAttribute('aria-pressed', String(dark));
   button.setAttribute('aria-label', label);
   button.title = label;
  }
 };
 const applyTheme = (mode) => {
  root.classList.toggle('u-mode-invert', mode === 'dark');
  colorScheme?.setAttribute('content', mode);
  const color = themeColor?.dataset[mode];
  if (themeColor && color) {
   // WebKit reprocesses insertion/removal as well as attribute changes (#220944).
   // Replace the node to avoid relying only on an in-place content update.
   const next = themeColor.cloneNode();
   next.content = color;
   themeColor.replaceWith(next);
   themeColor = next;
  }
  syncButtons();
 };

 preference = readPreference();
 applyTheme(preference ?? preferredMode());
 document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
 document.addEventListener('click', (event) => {
  if (!event.target?.closest?.('[data-theme-toggle]')) return;
  const mode = root.classList.contains('u-mode-invert') ? 'light' : 'dark';
  preference = mode; // Keep the manual override even if storage is unavailable.
  applyTheme(mode);
  try { localStorage.setItem('color-mode', mode); } catch {}
 });
 systemTheme.addEventListener('change', () => {
  if (preference === null) applyTheme(preferredMode());
 });
 // A cached page can predate a theme choice made on another page.
 window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  preference = readPreference();
  applyTheme(preference ?? preferredMode());
 });
})();
