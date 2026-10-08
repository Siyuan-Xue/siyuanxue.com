import type { PhotoSwipeOptions, SlideData } from 'photoswipe';

type GallerySlide = SlideData & { caption: string };
type GalleryModule = { open: (items: GallerySlide[], index: number, reducedMotion: boolean) => () => void };
type Dependencies = {
 load: () => Promise<GalleryModule>;
 navigate: (href: string) => void;
 reducedMotion: () => boolean;
};

export function createGalleryLightboxOptions(reducedMotion: boolean): PhotoSwipeOptions {
 return {
  mainClass: 'gallery-lightbox', loop: false, escKey: true, arrowKeys: true,
  trapFocus: true, returnFocus: true, showHideAnimationType: 'none',
  showAnimationDuration: 0, hideAnimationDuration: 0,
  zoomAnimationDuration: reducedMotion ? 0 : 200,
  close: false, zoom: false, arrowPrev: false, arrowNext: false,
  padding: { top: 64, bottom: 100, left: 24, right: 24 },
 };
}

async function loadGalleryModule(): Promise<GalleryModule> {
 const [{ default: PhotoSwipe }] = await Promise.all([import('photoswipe'), import('photoswipe/style.css')]);
 return { open(items, index, reducedMotion) {
  const pswp = new PhotoSwipe({ ...createGalleryLightboxOptions(reducedMotion), dataSource: items, index });
  pswp.on('uiRegister', () => {
   const controls: [string, string, () => void][] = [
    ['close', 'Close', () => pswp.close()],
    ['zoom', 'Zoom', () => pswp.toggleZoom()],
   ];
   if (items.length > 1) controls.push(['previous', 'Previous', () => pswp.prev()], ['next', 'Next', () => pswp.next()]);
   controls.forEach(([name, label, onClick], order) => pswp.ui?.registerElement({
    name: `gallery-${name}`, order: order + 10, isButton: true, title: label,
    onInit: element => { element.textContent = label; }, onClick,
   }));
   pswp.ui?.registerElement({ name: 'gallery-caption', appendTo: 'root', onInit: element => {
    const update = () => { element.textContent = items[pswp.currIndex]?.caption ?? ''; };
    pswp.on('change', update); update();
   }});
  });
  pswp.init();
  pswp.element?.setAttribute('aria-label', 'Image gallery');
  pswp.element?.setAttribute('aria-modal', 'true');
  return () => pswp.destroy();
 }};
}

/** Progressive enhancement: native anchors remain usable before initialization and after teardown. */
export function bindGalleryLightbox(root: HTMLElement, dependencies: Dependencies = {
 load: loadGalleryModule,
 navigate: href => window.location.assign(href),
 reducedMotion: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}): () => void {
 let disposed = false;
 let pending = false;
 let unavailable = false;
 let close: (() => void) | undefined;
 const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>('a[data-gallery-image]'));
 const items: GallerySlide[] = anchors.map(anchor => ({
  src: anchor.href, width: Number(anchor.dataset.width), height: Number(anchor.dataset.height),
  alt: anchor.dataset.alt ?? '', caption: anchor.dataset.caption ?? '',
  element: anchor, msrc: anchor.querySelector('img')?.src,
 }));
 const onClick = (event: MouseEvent) => {
  if (unavailable || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const target = event.target as Element | null;
  const anchor = target?.closest?.('a[data-gallery-image]') as HTMLAnchorElement | null;
  const index = anchor ? anchors.indexOf(anchor) : -1;
  if (index < 0 || !anchor || anchor.download || (anchor.target && anchor.target !== '_self')) return;
  if (items.some(item => !item.width || !item.height)) return;
  event.preventDefault();
  if (pending) return;
  pending = true;
  dependencies.load().then(module => {
   if (!disposed) {
    anchor.focus({ preventScroll: true });
    close = module.open(items, index, dependencies.reducedMotion());
   }
  }).catch(() => {
   unavailable = true;
   if (!disposed) dependencies.navigate(anchor.href);
  })
   .finally(() => { pending = false; });
 };
 root.addEventListener('click', onClick);
 return () => { disposed = true; root.removeEventListener('click', onClick); close?.(); close = undefined; };
}
