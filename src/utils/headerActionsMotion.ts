import { animate } from 'motion/mini';
import { spring, stagger } from 'motion';

export interface HeaderActionsMotion {
 set(open: boolean, instant: boolean): void;
 destroy(): void;
}
export type HeaderActionsMotionFactory = (root: HTMLElement) => HeaderActionsMotion;

// The small injectable driver keeps lifecycle/interruption tests independent of WAAPI.
type Options = NonNullable<Parameters<typeof animate>[2]>;
export type HeaderAnimate = (
 element: HTMLElement, values: Record<string, string[]>, options: Options,
) => { stop(): void };

export function createHeaderActionsMotion(root: HTMLElement, run: HeaderAnimate = animate): HeaderActionsMotion {
 const window = root.ownerDocument.defaultView!;
 const panel = root.querySelector<HTMLElement>('[data-actions-panel]')!;
 const icon = root.querySelector<HTMLElement>('[data-actions-icon]');
 const items = Array.from(panel.querySelector<HTMLElement>('.header-actions-row')?.children ?? []) as HTMLElement[];
 // Small DOM fixtures/older cached markup can still use the semantic controller.
 if (!icon) return { set() {}, destroy() {} };
 const mobile = window.matchMedia('(max-width: 767px)');
 const elements = [root, icon, ...items];
 const styles = ['paddingTop', 'transform', 'opacity'] as const;
 let controls: { stop(): void }[] = [];
 let revision = 0;
 let target = false;

 // Read before stopping: also works on older WebKit without commitStyles(). Never
 // reset to an endpoint on interruption, including animations still in their delay.
 const stop = () => {
  ++revision;
  const snapshots = elements.map(element => {
   const computed = window.getComputedStyle(element);
   return styles.map(property => computed[property]);
  });
  controls.forEach(control => control.stop());
  controls = [];
  elements.forEach((element, i) => styles.forEach((property, j) => {
   element.style[property] = snapshots[i]![j]!;
  }));
 };
 const clear = () => {
  elements.forEach(element => styles.forEach(property => { element.style[property] = ''; }));
  panel.style.visibility = '';
  items.forEach(item => { item.inert = false; item.removeAttribute('aria-hidden'); });
  delete root.dataset.actionsAnimating;
 };
 const set = (open: boolean, instant: boolean) => {
  stop();
  target = open;
  // Keyboard activation/Tab, hints, BFCache, reduced motion and missing WAAPI all
  // settle synchronously. Focus never waits behind the pointer-only stagger.
  if (instant || typeof panel.animate !== 'function') { clear(); return; }
  const token = revision;
  const visible = items.filter(item => !item.hidden && window.getComputedStyle(item).display !== 'none');
  let pending = 0;
  const tween = (element: HTMLElement, property: typeof styles[number], to: string, options: Options, done?: () => void) => {
   // WAAPI keyframe properties must be camelCase (hyphenated padding is ignored).
   const from = window.getComputedStyle(element)[property];
   pending++;
   controls.push(run(element, { [property]: [from, to] }, {
    ...options,
    onComplete: () => {
     if (token !== revision) return;
     done?.();
     if (--pending === 0) { controls = []; clear(); }
    },
   }));
  };
  root.dataset.actionsAnimating = 'true';
  panel.style.visibility = 'visible';
  // No spring on layout: main content moves continuously, with no bounce or jump.
  tween(root, 'paddingTop', mobile.matches && open ? '48px' : '0px', {
   duration: .30, delay: open ? 0 : .08, ease: [.33, 0, .2, 1],
  });
  tween(icon, 'transform', `rotate(${open ? 180 : 0}deg)`, {
   type: spring, duration: .42, bounce: .12,
  });
  const delay = stagger(.024, { from: 'last', startDelay: mobile.matches ? .09 : 0 });
  visible.forEach((item, index) => {
   // The controller makes the parent inert synchronously on close. Each item becomes
   // interactive after its short fade, well before the spring finishes settling.
   item.inert = true;
   item.setAttribute('aria-hidden', 'true');
   const wait = open ? delay(index, visible.length) : 0;
   tween(item, 'transform', open ? 'translate(0px, 0px)' : `translate(16px, ${mobile.matches ? 8 : 0}px)`, {
    ...(open ? { type: spring, duration: .44, bounce: .16 } : { duration: .16, ease: 'easeOut' as const }),
    delay: wait,
   });
   tween(item, 'opacity', open ? '1' : '0', { duration: .12, delay: wait, ease: 'easeOut' }, () => {
    if (open) { item.inert = false; item.removeAttribute('aria-hidden'); }
   });
  });
 };
 const onBreakpoint = () => set(target, true);
 mobile.addEventListener('change', onBreakpoint);
 return {
  set,
  destroy() { stop(); clear(); mobile.removeEventListener('change', onBreakpoint); },
 };
}
