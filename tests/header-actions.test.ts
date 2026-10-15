import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { readFileSync } from 'node:fs';
import { bindHeaderActions } from '../src/utils/headerActions';
import { bindToc } from '../src/utils/toc';

const css = readFileSync('src/styles/header-actions.css', 'utf8');
function fixture(reduce = false) {
 const window = new Window({ settings: { device: { prefersReducedMotion: reduce ? 'reduce' : 'no-preference' } } });
 window.innerWidth = 390;
 window.document.head.innerHTML = `<style>${css}</style>`;
 window.document.body.innerHTML = `<header class="header"><div data-header-actions data-actions-expanded="false" class="header-controls">
  <div id="header-actions" data-actions-panel class="header-actions-panel"><div class="header-actions-row">
   <button data-toc-toggle hidden aria-expanded="false" data-open-label="Open contents" data-close-label="Close contents">TOC</button>
   <a href="/">Home</a><button data-close-actions>New chat</button><a href="https://xuesiyuan.com/" lang="zh-CN">中文</a>
  </div></div>
  <button data-actions-toggle aria-controls="header-actions" aria-expanded="false" data-show-label="Show actions" data-hide-label="Hide actions">Arrow</button>
 </div></header><nav id="site-toc"><a href="#first" data-toc-link="first">First</a></nav><main class="page-main"><button id="outside">Outside</button><h2 id="first">First</h2></main>`;
 const document = window.document as unknown as Document;
 const root = document.querySelector<HTMLElement>('[data-header-actions]')!;
 const panel = document.querySelector<HTMLElement>('[data-actions-panel]')!;
 const toggle = document.querySelector<HTMLButtonElement>('[data-actions-toggle]')!;
 const outside = document.querySelector<HTMLButtonElement>('#outside')!;
 const cleanup = bindHeaderActions(root);
 return { window, document, root, panel, toggle, outside, cleanup };
}

test('SSR is visually collapsed; activation updates ARIA, inert and labels in both directions', () => {
 const f = fixture();
 expect(f.toggle.getAttribute('aria-controls')).toBe(f.panel.id);
 expect(f.panel.inert).toBe(true);
 expect(f.panel.getAttribute('aria-hidden')).toBe('true');
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('hidden');
 f.toggle.click();
 expect(f.toggle.getAttribute('aria-expanded')).toBe('true');
 expect(f.toggle.getAttribute('aria-label')).toBe('Hide actions');
 expect(f.panel.inert).toBe(false);
 expect(f.panel.getAttribute('aria-hidden')).toBe('false');
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('visible');
 f.toggle.click();
 expect(f.toggle.getAttribute('aria-expanded')).toBe('false');
 expect(f.toggle.getAttribute('aria-label')).toBe('Show actions');
 expect(f.panel.inert).toBe(true); // Immediate, even while the closing animation runs.
});

test('Escape returns focus to the arrow, excluding hidden actions from keyboard/a11y', () => {
 const f = fixture(); f.toggle.click();
 f.panel.querySelector<HTMLAnchorElement>('a')!.focus();
 const event = new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
 f.window.document.dispatchEvent(event);
 expect(event.defaultPrevented).toBe(true);
 expect(f.document.activeElement).toBe(f.toggle);
 expect(f.panel.inert).toBe(true);
 expect(f.panel.getAttribute('aria-hidden')).toBe('true');
 expect(f.window.getComputedStyle(f.panel as never).visibility).toBe('hidden');
});

test('outside click closes, returning owned focus but preserving an outside focus target', () => {
 const f = fixture(); f.toggle.click();
 f.panel.querySelector<HTMLAnchorElement>('a')!.focus();
 f.outside.click();
 expect(f.document.activeElement).toBe(f.toggle);
 expect(f.toggle.getAttribute('aria-expanded')).toBe('false');
 f.toggle.click(); f.outside.focus(); f.outside.click();
 expect(f.document.activeElement).toBe(f.outside);
 expect(f.toggle.getAttribute('aria-expanded')).toBe('false');
});

test('new chat dismisses the row; repeat clicks and BFCache never leave hidden actions active', () => {
 const f = fixture();
 for (let i = 0; i < 5; i++) { f.toggle.click(); f.toggle.click(); }
 expect(f.panel.inert).toBe(true);
 f.toggle.click(); f.panel.querySelector<HTMLButtonElement>('[data-close-actions]')!.click();
 expect(f.panel.inert).toBe(true);
 f.toggle.click();
 const event = new f.window.Event('pageshow'); Object.defineProperty(event, 'persisted', { value: true });
 f.window.dispatchEvent(event);
 expect(f.panel.inert).toBe(true);
 f.cleanup(); f.toggle.click(); expect(f.panel.inert).toBe(true);
});

test('mobile TOC owns the first Escape; closing actions also releases the TOC scroll/inert lock', () => {
 const f = fixture(); bindToc(f.document); f.toggle.click();
 const tocToggle = f.document.querySelector<HTMLButtonElement>('[data-toc-toggle]')!;
 tocToggle.click();
 expect(f.document.querySelector<HTMLElement>('main')!.inert).toBe(true);
 f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
 expect(f.toggle.getAttribute('aria-expanded')).toBe('true');
 expect(tocToggle.getAttribute('aria-expanded')).toBe('false');
 expect(f.document.activeElement).toBe(tocToggle);
 f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
 expect(f.document.activeElement).toBe(f.toggle);
 expect(f.panel.inert).toBe(true);
 f.toggle.click(); tocToggle.click(); f.toggle.click();
 expect(f.document.querySelector<HTMLElement>('main')!.inert).toBe(false);
 expect(f.document.body.style.overflow).toBe('');
});

test('reduced motion removes transitions while preserving all toggle behavior', () => {
 const f = fixture(true);
 expect(f.window.getComputedStyle(f.panel as never).transition).toBe('none');
 expect(f.window.getComputedStyle(f.root as never).transition).toBe('none');
 f.toggle.click(); expect(f.panel.inert).toBe(false);
 f.toggle.click(); expect(f.panel.inert).toBe(true);
});

test('the desktop TOC returns focus to the visible arrow when its own toggle is collapsed', () => {
 const f = fixture(); f.window.innerWidth = 1280; bindToc(f.document);
 f.document.querySelector<HTMLAnchorElement>('#site-toc a')!.focus();
 f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
 expect(f.document.querySelector<HTMLElement>('#site-toc')!.hidden).toBe(true);
 expect(f.document.activeElement).toBe(f.toggle);
 expect(f.panel.inert).toBe(true);
});
