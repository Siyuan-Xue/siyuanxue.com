/** Shared by the static header and the hydrated chat header. No persisted state. */
export function bindHeaderActions(root: HTMLElement): () => void {
 const document = root.ownerDocument;
 const window = document.defaultView;
 const toggle = root.querySelector<HTMLButtonElement>('[data-actions-toggle]');
 const panel = root.querySelector<HTMLElement>('[data-actions-panel]');
 if (!window || !toggle || !panel) return () => {};
 const header = root.closest<HTMLElement>('header');
 const wide = window.matchMedia('(min-width: 1024px)');
 let open = false;
 const setOpen = (next: boolean, returnFocus = false) => {
  if (!next) {
   // Close the mobile TOC and release its main-content lock before hiding its button.
   document.dispatchEvent(new window.Event('headeractionsclose'));
   if (returnFocus || panel.contains(document.activeElement)) toggle.focus({ preventScroll: true });
  }
  open = next;
  root.dataset.actionsExpanded = String(open);
  if (header) header.dataset.actionsExpanded = String(open);
  toggle.setAttribute('aria-expanded', String(open));
  const label = (open ? toggle.dataset.hideLabel : toggle.dataset.showLabel) ?? '';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  panel.inert = !open;
  panel.setAttribute('aria-hidden', String(!open));
  document.dispatchEvent(new window.Event('headeractionschange'));
 };
 const onToggle = (event: MouseEvent) => {
  setOpen(!open);
  if (open && event.detail === 0) panel.querySelector<HTMLElement>('a[href], button:not([hidden])')?.focus({ preventScroll: true });
 };
 const onKey = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !open || event.defaultPrevented) return;
  const toc = document.querySelector('#site-toc');
  const tocOpen = document.querySelector('[data-toc-toggle]')?.getAttribute('aria-expanded') === 'true';
  // Escape dismisses the inner TOC first; the next Escape dismisses the action row.
  if (tocOpen && (!wide.matches || toc?.contains(document.activeElement))) return;
  event.preventDefault();
  setOpen(false, true);
 };
 const onClick = (event: MouseEvent) => {
  const target = event.target as Element;
  if (!open || target.closest('#site-toc')) return;
  if (!root.contains(target) || target.closest('[data-close-actions]')) setOpen(false);
 };
 const onFocus = (event: FocusEvent) => {
  const target = event.target as Element;
  if (open && !root.contains(target) && !target.closest('#site-toc')) setOpen(false);
 };
 const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) setOpen(false); };
 setOpen(false);
 toggle.addEventListener('click', onToggle);
 document.addEventListener('keydown', onKey, true);
 document.addEventListener('click', onClick);
 document.addEventListener('focusin', onFocus);
 window.addEventListener('pageshow', onPageShow);
 return () => {
  toggle.removeEventListener('click', onToggle);
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('click', onClick);
  document.removeEventListener('focusin', onFocus);
  window.removeEventListener('pageshow', onPageShow);
 };
}
