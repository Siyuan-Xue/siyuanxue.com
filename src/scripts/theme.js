// Inlined in the head so theme and incoming layout state apply before first paint.
// Receives the single themeHint implementation serialized by BaseHead.
(hint) => {
 const root = document.documentElement;
 const themeColors = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
 const colors = themeColors[0].dataset;
 let overrideColor = null;
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
  hintHref: (href) => hint.href(href, {
   theme: preference,
   header: document.querySelector('[data-header-actions]')?.dataset.actionsExpanded === 'true' ? 'open' : undefined,
   media: document.querySelector('[data-romantic-trigger]')?.getAttribute('aria-expanded') === 'true' ? 'shown' : undefined,
  }),
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
  root.dataset.theme = mode;
  // Paint the root canvas even before external styles arrive. Every entry path
  // (hint, storage, toggle, system and BFCache) goes through this same function.
  root.style.backgroundColor = colors[mode];
  root.style.colorScheme = mode;
  colorScheme?.setAttribute('content', mode);
  // Media queries describe the OS preference, not the forced CSS color-scheme.
  // Keep the parser's pair when it agrees; use one unconditional node otherwise.
  if (preference !== null && mode !== preferredMode()) {
   const next = themeColors[0].cloneNode();
   next.removeAttribute('media');
   next.content = colors[mode];
   if (overrideColor) overrideColor.replaceWith(next);
   else {
    themeColors[0].before(next);
    themeColors.forEach(meta => meta.remove());
   }
   overrideColor = next;
  } else if (overrideColor) {
   overrideColor.before(...themeColors);
   overrideColor.remove();
   overrideColor = null;
  }
  syncButtons();
  document.dispatchEvent(new window.Event('site-theme-change'));
 };

 const incoming = hint.parse(window.location.hash);
 // An incoming explicit choice wins without reading/applying the origin's old value.
 if (incoming.theme) savePreference(incoming.theme);
 else preference = readPreference();
 applyTheme(preference ?? preferredMode());
 // CSS covers streaming HTML before the modules load. The observer synchronizes
 // semantics as each SSR component arrives, before the browser can paint it.
 if (incoming.header) root.dataset.headerHint = incoming.header;
 if (incoming.media) root.dataset.mediaHint = incoming.media;
 const prepareLayout = () => {
  if (incoming.header) {
   const actions = document.querySelector('[data-header-actions]');
   if (actions && !actions.dataset.actionsInitialized) {
    actions.dataset.actionsExpanded = 'true';
    const header = actions.closest('header');
    if (header) header.dataset.actionsExpanded = 'true';
    const toggle = actions.querySelector('[data-actions-toggle]');
    const panel = actions.querySelector('[data-actions-panel]');
    if (toggle) {
     toggle.setAttribute('aria-expanded', 'true');
     toggle.setAttribute('aria-label', toggle.dataset.hideLabel ?? '');
     toggle.title = toggle.dataset.hideLabel ?? '';
    }
    if (panel) { panel.inert = false; panel.setAttribute('aria-hidden', 'false'); }
   }
  }
  if (incoming.media) {
   const portrait = document.querySelector('[data-romantic-mode]');
   if (portrait && !portrait.dataset.initialized) {
    portrait.classList.add('is-active');
    const trigger = portrait.querySelector('[data-romantic-trigger]');
    const card = portrait.querySelector('[data-secret-card]');
    if (trigger) {
     trigger.setAttribute('aria-expanded', 'true');
     trigger.setAttribute('aria-pressed', 'true');
     trigger.setAttribute('aria-label', portrait.dataset.turnOffLabel ?? '');
    }
    if (card) { card.hidden = false; card.classList.add('is-loading'); }
   }
  }
 };
 if (incoming.header || incoming.media) {
  prepareLayout();
  const observer = new window.MutationObserver(prepareLayout);
  observer.observe(root, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => { prepareLayout(); observer.disconnect(); }, { once: true });
 }
 if (Object.keys(incoming).length) {
  const hash = hint.strip(window.location.hash, Object.keys(incoming));
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
  // An explicit choice stays fixed, but may now need (or cease needing) an override.
  applyTheme(preference ?? preferredMode());
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
