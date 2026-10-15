import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { bindToc } from '../src/utils/toc';

import { bindHeader } from '../src/utils/header';

function fixture(wide = false, chat = false) {
 const window = new Window({ url: 'https://example.test/essay/test/' });
 const media = new window.EventTarget() as unknown as MediaQueryList;
 let matches = wide;
 Object.defineProperty(media, 'matches', { get: () => matches });
 window.matchMedia = () => media as never;
 window.document.body.innerHTML = `<header class="header${chat ? ' xue-chat-header' : ''}" ${chat ? '' : 'data-scroll-header'}><a href="/">Home</a><button data-toc-toggle data-open-label="Open" data-close-label="Close" aria-expanded="false">Contents</button></header><nav id="site-toc"><a href="#first" data-toc-link="first">First</a></nav><main class="page-main" tabindex="-1"><h2 id="first">First</h2></main>`;
 const document = window.document as unknown as Document;
 const browserWindow = document.defaultView!;
 const header = document.querySelector<HTMLElement>('header')!;
 const toggle = document.querySelector<HTMLButtonElement>('button')!;
 const main = document.querySelector<HTMLElement>('main')!;
 let scrollY = 0;
 let height = 68;
 Object.defineProperty(window, 'scrollY', { get: () => scrollY });
 header.getBoundingClientRect = () => ({ height, bottom: header.dataset.headerHidden === 'true' ? 0 : height }) as DOMRect;
 let frameId = 0;
 const frames = new Map<number, FrameRequestCallback>();
 browserWindow.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
 browserWindow.cancelAnimationFrame = id => { frames.delete(id); };
 const flush = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(0)); };
 const scroll = (next: number, immediate = true) => { scrollY = next; window.dispatchEvent(new window.Event('scroll')); if (immediate) flush(); };
 return { window, document, header, toggle, main, scroll, flush, frames,
  resize: (nextWide: boolean, nextHeight = height) => { matches = nextWide; height = nextHeight; media.dispatchEvent(new window.Event('change') as unknown as Event); window.dispatchEvent(new window.Event('resize')); flush(); },
 };
}

function bind(document: Document) {
 return bindHeader(document);
}

function hidden(header: HTMLElement) { return header.dataset.headerHidden === 'true'; }

test('header stays visible through its full height, then hides after 12px downward and shows after 8px upward', () => {
 const f = fixture(); bind(f.document);
 f.scroll(68); expect(hidden(f.header)).toBe(false);
 f.scroll(69); f.scroll(74); f.scroll(79); expect(hidden(f.header)).toBe(false);
 f.scroll(80); expect(hidden(f.header)).toBe(true);
 f.scroll(73); expect(hidden(f.header)).toBe(true);
 f.scroll(72); expect(hidden(f.header)).toBe(false);
});


test('a first scroll across the top boundary counts only travel beyond the full header height', () => {
 const f = fixture(); bind(f.document);
 f.scroll(79); expect(hidden(f.header)).toBe(false);
 f.scroll(80); expect(hidden(f.header)).toBe(true);
});

test('direction changes reset accumulated travel instead of hiding after opposing small scrolls', () => {
 const f = fixture(); f.scroll(100); bind(f.document);
 f.scroll(107); f.scroll(106); f.scroll(113); expect(hidden(f.header)).toBe(false);
 f.scroll(118); expect(hidden(f.header)).toBe(true);
 f.scroll(112); f.scroll(113); f.scroll(106); expect(hidden(f.header)).toBe(true);
 f.scroll(105); expect(hidden(f.header)).toBe(false);
});

test('scroll handling batches updates into a single animation frame', () => {
 const f = fixture(); f.scroll(100); bind(f.document);
 f.scroll(105, false); f.scroll(112, false);
 expect(hidden(f.header)).toBe(false);
 expect(f.frames.size).toBe(1);
 f.flush(); expect(hidden(f.header)).toBe(true);
});

test('returning to the top reveals a hidden header and clears accumulated movement', () => {
 const f = fixture(); f.scroll(200); bind(f.document);
 f.scroll(212); expect(hidden(f.header)).toBe(true);
 f.scroll(0); expect(hidden(f.header)).toBe(false);
 f.scroll(-15); f.scroll(68); expect(hidden(f.header)).toBe(false);
 f.scroll(79); expect(hidden(f.header)).toBe(false);
 f.scroll(80); expect(hidden(f.header)).toBe(true);
});

test('focusing any header control immediately reveals it and locks it until focus leaves', () => {
 const f = fixture(); f.scroll(100); bind(f.document);
 f.scroll(112); expect(hidden(f.header)).toBe(true);
 f.toggle.focus(); expect(hidden(f.header)).toBe(false);
 f.scroll(160); expect(hidden(f.header)).toBe(false);
 f.main.focus();
 f.scroll(171); expect(hidden(f.header)).toBe(false);
 f.scroll(172); expect(hidden(f.header)).toBe(true);
});

test('an open mobile TOC reveals and locks the header even when focus moves into the menu', () => {
 const f = fixture(); f.scroll(100); bind(f.document); bindToc(f.document);
 f.scroll(112); expect(hidden(f.header)).toBe(true);
 f.toggle.click(); expect(hidden(f.header)).toBe(false);
 expect(f.document.activeElement).toBe(f.document.querySelector('#site-toc a'));
 f.scroll(180); expect(hidden(f.header)).toBe(false);
 f.document.querySelector<HTMLAnchorElement>('#site-toc a')!.click();
 f.scroll(191); expect(hidden(f.header)).toBe(false);
 f.scroll(192); expect(hidden(f.header)).toBe(true);
});

test('the default-open desktop TOC does not lock header scrolling', () => {
 const f = fixture(true); f.scroll(100); bind(f.document); bindToc(f.document);
 expect(f.toggle.getAttribute('aria-expanded')).toBe('true');
 f.scroll(112); expect(hidden(f.header)).toBe(true);
});

test('expanded header actions keep the header visible even without header focus', () => {
 const f = fixture(); f.scroll(100); bind(f.document);
 f.scroll(112); expect(hidden(f.header)).toBe(true);
 f.header.dataset.actionsExpanded = 'true';
 f.document.dispatchEvent(new f.window.Event('headeractionschange') as unknown as Event);
 expect(hidden(f.header)).toBe(false);
 f.scroll(300); expect(hidden(f.header)).toBe(false);
 f.header.dataset.actionsExpanded = 'false';
 f.document.dispatchEvent(new f.window.Event('headeractionschange') as unknown as Event);
 f.scroll(312); expect(hidden(f.header)).toBe(true);
});

test('resizing refreshes the full header height used for the top visibility lock', () => {
 const f = fixture(); f.scroll(100); bind(f.document);
 f.scroll(112); expect(hidden(f.header)).toBe(true);
 f.resize(false, 120); expect(hidden(f.header)).toBe(false);
 f.scroll(120); expect(hidden(f.header)).toBe(false);
 f.scroll(131); expect(hidden(f.header)).toBe(false);
 f.scroll(132); expect(hidden(f.header)).toBe(true);
});

test('chat headers remain visible and never schedule scroll work', () => {
 const f = fixture(false, true); bind(f.document);
 f.scroll(200, false);
 expect(hidden(f.header)).toBe(false);
 expect(f.frames.size).toBe(0);
});

test('cleanup restores visibility and removes scroll handling', () => {
 const f = fixture(); f.scroll(100); const cleanup = bind(f.document);
 f.scroll(112); expect(hidden(f.header)).toBe(true);
 cleanup(); expect(hidden(f.header)).toBe(false);
 f.scroll(200, false); expect(f.frames.size).toBe(0);
});
