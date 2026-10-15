// Inlined in the head so the saved theme is applied before the first paint.
// Receives the single themeHint implementation serialized by BaseHead.
(hint) => {
 const root = document.documentElement;
 let themeColor = document.querySelector('meta[name="theme-color"]');
 const colorScheme = document.querySelector('meta[name="color-scheme"]');
 const systemTheme = matchMedia('(prefers-color-scheme: dark)');
 const preferredMode = () => systemTheme.matches ? 'dark' : 'light';
 let preference = null;
 let unsavedPreference = false;
 const readPreference = () => {
  if (unsavedPreference) return preference;
  try {
   return hint.preference(localStorage.getItem('color-mode'));
  } catch { return preference; }
 };
 const savePreference = (mode) => {
  preference = mode;
  try { localStorage.setItem('color-mode', mode); unsavedPreference = false; }
  catch { unsavedPreference = true; }
 };
 window.__siteTheme = {
  getPreference: () => preference,
  hintHref: (href) => hint.href(href, preference),
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
  document.dispatchEvent(new window.Event('site-theme-change'));
 };

 const incoming = hint.parse(window.location.hash);
 // An incoming explicit choice wins without reading/applying the origin's old value.
 if (incoming) savePreference(incoming);
 else preference = readPreference();
 applyTheme(preference ?? preferredMode());
 if (incoming) {
  const hash = hint.strip(window.location.hash);
  try {
   window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search + hash);
   // replaceState does not perform fragment scrolling. The target is not parsed yet.
   document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash !== hash) return;
    const id = hint.anchor(hash);
    if (id) (document.getElementById(id) ?? document.getElementsByName(id)[0])?.scrollIntoView();
   }, { once: true });
  } catch {} // A restricted history API must not prevent theme controls from working.
 }
 document.addEventListener('DOMContentLoaded', syncButtons, { once: true });
 document.addEventListener('click', (event) => {
  if (!event.target?.closest?.('[data-theme-toggle]')) return;
  const mode = root.classList.contains('u-mode-invert') ? 'light' : 'dark';
  savePreference(mode); // Keep the manual override even if storage is unavailable.
  applyTheme(mode);
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
 // A choice in another tab on this origin also refreshes any open switch links.
 window.addEventListener('storage', (event) => {
  if (event.key !== 'color-mode' && event.key !== null) return;
  preference = readPreference();
  applyTheme(preference ?? preferredMode());
 });
}
