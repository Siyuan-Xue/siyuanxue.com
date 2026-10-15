import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { createHeaderActionsMotion, type HeaderAnimate } from '../src/utils/headerActionsMotion';

test('all widths using the second row retain 44px targets after the base styles load', () => {
 for (const width of [390, 481, 600, 767]) {
  const window = new Window({ width });
  // base.css imports header-actions first, then declares the desktop root defaults.
  window.document.head.innerHTML = `<style>${readFileSync('src/styles/header-actions.css', 'utf8')}
   ${readFileSync('src/styles/base.css', 'utf8').replace(/^@import .*;$/gm, '')}</style>`;
  window.document.body.innerHTML = '<header class="header"><button class="header-control-button">Arrow</button></header>';
  const button = window.document.querySelector('button')!;
  expect(window.getComputedStyle(button).height).toBe('44px');
  expect(window.getComputedStyle(button).width).toBe('44px');
 }
});

function fixture() {
 const window = new Window();
 window.innerWidth = 390;
 window.document.head.innerHTML = `<style>${readFileSync('src/styles/header-actions.css', 'utf8')}</style>`;
 window.document.body.innerHTML = `<div class="header-controls" data-actions-expanded="false">
  <div class="header-actions-panel" data-actions-panel><div class="header-actions-row"><button>First</button><button>Middle</button><a href="/">Language</a></div></div>
  <button><span class="header-actions-icon" data-actions-icon>Arrow</span></button></div>`;
 const root = window.document.querySelector('.header-controls') as unknown as HTMLElement;
 const panel = root.querySelector<HTMLElement>('[data-actions-panel]')!;
 const items = Array.from(root.querySelectorAll<HTMLElement>('.header-actions-row > *'));
 const calls: { element: HTMLElement; values: Record<string, string[]>; options: Parameters<HeaderAnimate>[2]; stopped: boolean }[] = [];
 const run: HeaderAnimate = (element, values, options) => {
  const call = { element, values, options, stopped: false }; calls.push(call);
  return { stop() { call.stopped = true; } };
 };
 panel.animate = (() => {}) as unknown as typeof panel.animate;
 const motion = createHeaderActionsMotion(root, run);
 // happy-dom starts change listeners with matches=false, even at a mobile width.
 // Establish its initial match before testing actual breakpoint changes.
 window.dispatchEvent(new window.Event('resize'));
 const set = (open: boolean, instant = false) => { motion.set(open, instant); root.dataset.actionsExpanded = String(open); };
 return { window, root, panel, items, calls, motion, set };
}

test('stagger starts at the arrow; pointer items activate after their fade, with no animated initial hint', () => {
 const f = fixture();
 f.set(true, true);
 expect(f.calls).toHaveLength(0);
 f.set(false, true); f.set(true);
 const fades = f.calls.filter(call => 'opacity' in call.values);
 fades.forEach((call, i) => expect(call.options.delay as number).toBeCloseTo([.138, .114, .09][i]!));
 expect(f.items.every(item => item.inert)).toBe(true);
 fades.at(-1)!.options.onComplete?.();
 expect(f.items.at(-1)!.inert).toBe(false);
 expect(f.items[0]!.inert).toBe(true);
 f.calls.filter(call => call !== fades.at(-1)).forEach(call => call.options.onComplete?.());
 expect(f.root.dataset.actionsAnimating).toBeUndefined();
 expect(f.items.every(item => !item.inert && !item.hasAttribute('aria-hidden'))).toBe(true);
});

test('interruption stops every old control, starts at the current values and ignores stale completions', () => {
 const f = fixture(); f.set(true);
 const opening = [...f.calls];
 // Simulate the computed WAAPI frame, including a partly rotated arrow/layout.
 f.items[0]!.style.transform = 'translate(7px, 3px)';
 f.items[0]!.style.opacity = '.4';
 f.root.style.paddingTop = '27px';
 f.root.querySelector<HTMLElement>('[data-actions-icon]')!.style.transform = 'rotate(72deg)';
 f.set(false);
 expect(opening.every(call => call.stopped)).toBe(true);
 const closing = f.calls.slice(opening.length);
 expect(closing.find(call => call.element === f.items[0] && 'transform' in call.values)!.values.transform![0]).toBe('translate(7px, 3px)');
 expect(Number(closing.find(call => call.element === f.items[0] && 'opacity' in call.values)!.values.opacity![0])).toBe(.4);
 expect(closing[0]!.values.paddingTop![0]).toBe('27px');
 expect(closing[1]!.values.transform![0]).toBe('rotate(72deg)');
 opening.forEach(call => call.options.onComplete?.());
 expect(f.root.dataset.actionsAnimating).toBe('true');
 expect(f.items.every(item => item.inert)).toBe(true);
 f.set(true);
 closing.forEach(call => call.options.onComplete?.());
 expect(f.root.dataset.actionsAnimating).toBe('true');
 f.set(false, true); // Reduced motion / keyboard / BFCache settles all active work.
 f.calls.forEach(call => call.options.onComplete?.());
 expect(f.root.dataset.actionsAnimating).toBeUndefined();
 expect(f.root.style.paddingTop).toBe('');
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('hidden');
 expect(f.calls.every(call => call.stopped)).toBe(true);
 f.motion.destroy();
});

test('unbind during the stagger stops pending controls and rejects late completions', () => {
 const f = fixture(); f.set(true);
 const pending = [...f.calls];
 f.motion.destroy();
 expect(pending.every(call => call.stopped)).toBe(true);
 expect(f.root.dataset.actionsAnimating).toBeUndefined();
 expect(f.items.every(item => !item.inert && !item.hasAttribute('aria-hidden'))).toBe(true);
 // An unbound controller must not overwrite styles owned by its replacement.
 f.items[0]!.style.opacity = '.75';
 pending.forEach(call => call.options.onComplete?.());
 f.window.innerWidth = 1024;
 f.window.dispatchEvent(new f.window.Event('resize'));
 expect(f.items[0]!.style.opacity).toBe('.75');
 expect(f.calls).toHaveLength(pending.length);
});

test('crossing the mobile breakpoint settles the current target and releases layout styles', () => {
 const f = fixture(); f.set(true);
 f.root.style.paddingTop = '27px';
 f.window.innerWidth = 1024;
 f.window.dispatchEvent(new f.window.Event('resize'));
 expect(f.calls.every(call => call.stopped)).toBe(true);
 expect(f.root.dataset.actionsAnimating).toBeUndefined();
 expect(f.root.style.paddingTop).toBe('');
 expect(f.items.every(item => !item.inert)).toBe(true);
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('visible');
 f.set(false);
 f.window.innerWidth = 390;
 f.window.dispatchEvent(new f.window.Event('resize'));
 expect(f.root.dataset.actionsAnimating).toBeUndefined();
 expect(f.root.style.paddingTop).toBe('');
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('hidden');
 f.motion.destroy();
});
