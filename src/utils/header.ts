/** Keep static-page controls available when reading upwards or using the keyboard. */
export function bindHeader(document: Document): () => void {
 const window = document.defaultView;
 const header = document.querySelector<HTMLElement>('header[data-scroll-header]');
 if (!window || !header) return () => {};
 const wide = window.matchMedia('(min-width: 1024px)');
 const tocToggle = header.querySelector<HTMLButtonElement>('[data-toc-toggle]');
 let height = header.getBoundingClientRect().height;
 let previousY = Math.max(0, window.scrollY);
 let direction = 0;
 let distance = 0;
 let frame = 0;

 const resetTravel = () => {
  previousY = Math.max(0, window.scrollY);
  direction = 0;
  distance = 0;
 };
 const locked = () => previousY <= height
  || header.dataset.actionsExpanded === 'true'
  || header.contains(document.activeElement)
  || (!wide.matches && tocToggle?.getAttribute('aria-expanded') === 'true');
 const setHidden = (hidden: boolean) => {
  if ((header.dataset.headerHidden === 'true') === hidden) return;
  header.dataset.headerHidden = String(hidden);
  document.dispatchEvent(new window.Event('headervisibilitychange'));
 };
 const refreshLocks = () => {
  resetTravel();
  if (locked()) setHidden(false);
 };
 const update = () => {
  frame = 0;
  const y = Math.max(0, window.scrollY);
  const delta = y - Math.max(previousY, height);
  previousY = y;
  if (locked()) {
   resetTravel();
   setHidden(false);
   return;
  }
  if (!delta) return;
  const nextDirection = Math.sign(delta);
  if (nextDirection !== direction) distance = 0;
  direction = nextDirection;
  distance += Math.abs(delta);
  if (direction > 0 && distance >= 12) setHidden(true);
  else if (direction < 0 && distance >= 8) setHidden(false);
 };
 const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
 const onResize = () => {
  height = header.getBoundingClientRect().height;
  document.documentElement.style.setProperty('--header-current-height', `${height}px`);
  refreshLocks();
 };
 const observer = new window.ResizeObserver(onResize);
 observer.observe(header);
 refreshLocks();
 window.addEventListener('scroll', schedule, { passive: true });
 window.addEventListener('resize', onResize);
 wide.addEventListener('change', refreshLocks);
 document.addEventListener('focusin', refreshLocks);
 header.addEventListener('focusout', resetTravel);
 document.addEventListener('tocchange', refreshLocks);
 document.addEventListener('headeractionschange', onResize);
 return () => {
  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', onResize);
  wide.removeEventListener('change', refreshLocks);
  document.removeEventListener('focusin', refreshLocks);
  header.removeEventListener('focusout', resetTravel);
  document.removeEventListener('tocchange', refreshLocks);
  document.removeEventListener('headeractionschange', onResize);
  observer.disconnect();
  if (frame) window.cancelAnimationFrame(frame);
  setHidden(false);
 };
}
