// Inlined in the head so the saved theme is applied before the first paint.
(() => {
 const root = document.documentElement;
 const themeColor = document.querySelector('meta[name="theme-color"]');
 const colorScheme = document.querySelector('meta[name="color-scheme"]');
 const preferredMode = () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

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
  const color = themeColor?.dataset[mode];
  if (themeColor && color) themeColor.content = color;
  colorScheme?.setAttribute('content', mode);
  syncButtons();
 };

 let saved;
 try { saved = localStorage.getItem('color-mode'); } catch {}
 applyTheme(saved === 'dark' || saved === 'light' ? saved : preferredMode());
 document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
 document.addEventListener('click', (event) => {
  if (!event.target?.closest?.('[data-theme-toggle]')) return;
  const mode = root.classList.contains('u-mode-invert') ? 'light' : 'dark';
  applyTheme(mode);
  try { localStorage.setItem('color-mode', mode); } catch {}
 });
 // A cached page can predate a theme choice made on another page.
 window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  let current;
  try { current = localStorage.getItem('color-mode'); } catch { return; }
  applyTheme(current === 'dark' || current === 'light' ? current : preferredMode());
 });
})();
