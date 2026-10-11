import type { MarkdownHeading } from 'astro';
export function tocHeadings(headings: MarkdownHeading[]): MarkdownHeading[] { return headings.filter(({ depth }) => depth === 2 || depth === 3); }

export function bindToc(document: Document): () => void {
 const window = document.defaultView;
 const nav = document.querySelector<HTMLElement>('#site-toc');
 const toggle = document.querySelector<HTMLButtonElement>('[data-toc-toggle]');
 const main = document.querySelector<HTMLElement>('.page-main');
 if (!window || !nav || !toggle || !main) return () => {};
 const wide = window.matchMedia('(min-width: 1024px)');
 const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('[data-toc-link]'));
 const headings = links.map(link => document.getElementById(link.dataset.tocLink ?? '')).filter((heading): heading is HTMLElement => Boolean(heading));
 const initialOverflow = document.body.style.overflow;
 const initialInert = main.inert;
 let open = false;
 let frame = 0;

 const setOpen = (next: boolean, returnFocus = false) => {
  const ownedFocus = nav.contains(document.activeElement);
  open = next;
  nav.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  const label = (open ? toggle.dataset.closeLabel : toggle.dataset.openLabel) ?? '';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const coverArticle = open && !wide.matches;
  main.inert = coverArticle || initialInert;
  document.body.style.overflow = coverArticle ? 'hidden' : initialOverflow;
  if (!open && (ownedFocus || returnFocus)) toggle.focus({ preventScroll: true });
 };
 const activate = (id: string | undefined) => {
  links.forEach(link => {
   const active = link.dataset.tocLink === id;
   link.classList.toggle('cc-active', active);
   if (active) link.setAttribute('aria-current', 'location');
   else link.removeAttribute('aria-current');
  });
 };
 const updateActive = () => {
  frame = 0;
  const readingLine = (document.querySelector('header.header')?.getBoundingClientRect().bottom ?? 0) + 16;
  let current: HTMLElement | undefined = headings[0];
  for (const heading of headings) {
   if (heading.getBoundingClientRect().top > readingLine) break;
   current = heading;
  }
  // A short final section cannot always scroll up to the reading line.
  if (window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 2) current = headings.at(-1);
  activate(current?.id);
 };
 const scheduleActive = () => { if (!frame) frame = window.requestAnimationFrame(updateActive); };
 const onToggle = (event: MouseEvent) => {
  setOpen(!open);
  if (open && !wide.matches && event.detail === 0) (nav.querySelector<HTMLAnchorElement>('[aria-current="location"]') ?? links[0])?.focus();
 };
 const onKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false, true); }
 };
 const onLink = (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-toc-link]');
  if (!link || link.download || link.target === '_blank') return;
  activate(link.dataset.tocLink);
  if (!wide.matches) {
   setOpen(false);
   const heading = document.getElementById(link.dataset.tocLink ?? '');
   if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }
 };
 const onBreakpoint = () => { setOpen(wide.matches); scheduleActive(); };
 toggle.hidden = false;
 nav.dataset.tocReady = '';
 setOpen(wide.matches);
 updateActive();
 toggle.addEventListener('click', onToggle);
 nav.addEventListener('click', onLink);
 document.addEventListener('keydown', onKey);
 wide.addEventListener('change', onBreakpoint);
 window.addEventListener('scroll', scheduleActive, { passive: true });
 window.addEventListener('resize', scheduleActive);
 window.addEventListener('hashchange', scheduleActive);
 return () => {
  setOpen(false);
  toggle.hidden = true;
  toggle.removeEventListener('click', onToggle);
  nav.removeEventListener('click', onLink);
  document.removeEventListener('keydown', onKey);
  wide.removeEventListener('change', onBreakpoint);
  window.removeEventListener('scroll', scheduleActive);
  window.removeEventListener('resize', scheduleActive);
  window.removeEventListener('hashchange', scheduleActive);
  if (frame) window.cancelAnimationFrame(frame);
 };
}
