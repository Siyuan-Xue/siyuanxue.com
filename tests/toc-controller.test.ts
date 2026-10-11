import { expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import * as toc from '../src/utils/toc';

function fixture(wide = true) {
 const window = new Window({ url: 'https://example.test/essay/test/' });
 const media = new window.EventTarget() as unknown as MediaQueryList;
 let matches = wide;
 Object.defineProperty(media, 'matches', { get: () => matches });
 window.matchMedia = () => media as never;
 window.document.body.innerHTML = `<header><button data-toc-toggle hidden data-open-label="Open contents" data-close-label="Close contents" aria-expanded="false"></button></header><nav id="site-toc"><a href="#first" data-toc-link="first">First</a><a href="#second" data-toc-link="second">Second</a></nav><main class="page-main"><div class="prose"><h2 id="first">First</h2><p>Long section</p><h3 id="second">Second</h3></div></main>`;
 const document = window.document as unknown as Document;
 const toggle = document.querySelector<HTMLButtonElement>('[data-toc-toggle]')!;
 const nav = document.querySelector<HTMLElement>('#site-toc')!;
 const main = document.querySelector<HTMLElement>('main')!;
 const first = document.getElementById('first')!;
 const second = document.getElementById('second')!;
 first.getBoundingClientRect = () => ({ top: -800 }) as DOMRect;
 second.getBoundingClientRect = () => ({ top: 600 }) as DOMRect;
 return { window, document, toggle, nav, main, first, second, resize: (wide: boolean) => { matches = wide; media.dispatchEvent(new window.Event('change') as unknown as Event); } };
}

function bind(document: Document) {
 expect(toc).toHaveProperty('bindToc');
 return (toc as typeof toc & { bindToc: (doc: Document) => () => void }).bindToc(document);
}

test('desktop directory starts open and its toggle closes and reopens it', () => {
 const f = fixture(); bind(f.document);
 expect(f.toggle.hidden).toBe(false);
 expect(f.nav.hidden).toBe(false);
 expect(f.toggle.getAttribute('aria-expanded')).toBe('true');
 expect(f.main.inert).toBe(false);
 f.nav.querySelector<HTMLAnchorElement>('a')!.focus();
 f.toggle.click();
 expect(f.nav.hidden).toBe(true);
 expect(f.document.activeElement).toBe(f.toggle);
 f.toggle.click();
 expect(f.nav.hidden).toBe(false);
});

test('mobile menu locks the article and Escape returns focus and prior overflow', () => {
 const f = fixture(false); f.document.body.style.overflow = 'clip'; bind(f.document);
 expect(f.nav.hidden).toBe(true);
 f.toggle.click();
 expect(f.nav.hidden).toBe(false);
 expect(f.main.inert).toBe(true);
 expect(f.document.body.style.overflow).toBe('hidden');
 expect(f.document.activeElement).toBe(f.nav.querySelector('a'));
 expect(f.toggle.getAttribute('aria-label')).toBe('Close contents');
 f.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }) as unknown as Event);
 expect(f.nav.hidden).toBe(true);
 expect(f.main.inert).toBe(false);
 expect(f.document.body.style.overflow).toBe('clip');
 expect(f.document.activeElement).toBe(f.toggle);
});

test('mobile section navigation closes the menu and focuses the actual heading', () => {
 const f = fixture(false); bind(f.document); f.toggle.click();
 f.nav.querySelectorAll<HTMLAnchorElement>('a')[1].click();
 expect(f.nav.hidden).toBe(true);
 expect(f.main.inert).toBe(false);
 expect(f.document.activeElement).toBe(f.second);
 expect(f.second.tabIndex).toBe(-1);
});

test('pointer opening keeps focus on the toggle while keyboard opening enters the menu', () => {
 const f = fixture(false); bind(f.document); f.toggle.focus();
 f.toggle.dispatchEvent(new f.window.MouseEvent('click', { bubbles: true, detail: 1 }) as unknown as Event);
 expect(f.document.activeElement).toBe(f.toggle);
});

test('keyboard opening allows the browser to reveal a current link outside the menu viewport', () => {
 const f = fixture(false);
 f.second.getBoundingClientRect = () => ({ top: -20 }) as DOMRect;
 const link = f.nav.querySelectorAll<HTMLAnchorElement>('a')[1];
 const focus = link.focus.bind(link);
 // happy-dom has no layout: model native focus scrolling the fixed scroll container.
 link.focus = options => { if (!options?.preventScroll) f.nav.scrollTop = 400; focus(options); };
 bind(f.document); f.toggle.click();
 expect(f.document.activeElement).toBe(link);
 expect(f.nav.scrollTop).toBe(400);
});

test('resizing releases the article lock and keeps focus on a visible control', () => {
 const f = fixture(false); bind(f.document); f.toggle.click(); f.resize(true);
 expect(f.nav.hidden).toBe(false);
 expect(f.main.inert).toBe(false);
 expect(f.document.body.style.overflow).toBe('');
 f.resize(false);
 expect(f.nav.hidden).toBe(true);
 expect(f.document.activeElement).toBe(f.toggle);
});

test('scroll keeps the preceding section active until the next heading passes the reading line', async () => {
 const f = fixture(); bind(f.document);
 const links = f.nav.querySelectorAll<HTMLAnchorElement>('a');
 expect(links[0].getAttribute('aria-current')).toBe('location');
 expect(links[1].hasAttribute('aria-current')).toBe(false);
 f.second.getBoundingClientRect = () => ({ top: -20 }) as DOMRect;
 f.window.dispatchEvent(new f.window.Event('scroll'));
 await new Promise(resolve => setTimeout(resolve, 30));
 expect(links[0].hasAttribute('aria-current')).toBe(false);
 expect(links[1].getAttribute('aria-current')).toBe('location');
});

test('modified links keep the mobile menu and native event behavior', () => {
 const f = fixture(false); bind(f.document); f.toggle.click();
 const click = new f.window.MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
 f.nav.querySelector('a')!.dispatchEvent(click as unknown as Event);
 expect(f.nav.hidden).toBe(false);
 expect(click.defaultPrevented).toBe(false);
});

test('the last section is active at page bottom even when its heading cannot reach the reading line', () => {
 const f = fixture();
 Object.defineProperty(f.window, 'scrollY', { value: 2000 });
 Object.defineProperty(f.document.documentElement, 'scrollHeight', { value: 2000 + f.window.innerHeight });
 bind(f.document);
 expect(f.nav.querySelector('[aria-current="location"]')?.getAttribute('data-toc-link')).toBe('second');
});

test('cleanup restores article interaction and removes the toggle binding', () => {
 const f = fixture(false); const cleanup = bind(f.document); f.toggle.click(); cleanup();
 expect(f.main.inert).toBe(false);
 expect(f.document.body.style.overflow).toBe('');
 expect(f.nav.hidden).toBe(true);
 f.toggle.click(); expect(f.nav.hidden).toBe(true);
});
