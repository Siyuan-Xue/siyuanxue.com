import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { Window } from 'happy-dom';
import { inlineThemeScript } from '../src/utils/themeHint';
import { bindThemeLink } from '../src/utils/themeLink';

const script = inlineThemeScript(readFileSync(new URL('../src/scripts/theme.js', import.meta.url), 'utf8'));
const head = readFileSync(new URL('../src/components/BaseHead.astro', import.meta.url), 'utf8');
const styles = ['tokens', 'base'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8').replace(/^@import .*;$/gm, '')).join('\n');
const windows: Window[] = [];
afterEach(() => { for (const window of windows.splice(0)) window.happyDOM.abort(); });

function fixture(saved: string | null = null, systemDark = false, blocked: boolean | 'write' = false, hash = '', historyBlocked = false) {
 const window = new Window({ url: `https://example.test/essay/a/?keep=yes${hash}` });
 windows.push(window);
 const { document } = window;
 document.head.innerHTML = head.match(/<meta name="(?:theme-color|color-scheme)"[^>]*>/g)!.join('') + `<style>${styles}</style>`;
 document.body.remove(); // The blocking head script runs before body or controls exist.
 const media = new window.EventTarget();
 Object.defineProperty(media, 'matches', { get: () => systemDark });
 window.history.replaceState({ preserved: 42 }, '');
 const replacements: string[] = [];
 const replace = window.history.replaceState.bind(window.history);
 window.history.replaceState = (state, unused, url) => {
  if (historyBlocked) throw new Error('SecurityError');
  replacements.push(String(url));
  replace(state, unused, url);
 };
 let reads = 0;
 const context = createContext({ document, window, matchMedia: () => media, localStorage: {
  getItem: () => { reads++; if (blocked === true) throw new Error('SecurityError'); return saved; },
  setItem: (_key: string, value: string) => { if (blocked) throw new Error('SecurityError'); saved = value; },
 } });
 runInContext(script, context);
 let scrolled = false;
 const mount = () => {
  const body = document.createElement('body');
  body.innerHTML = '<header class="header" data-scroll-header><button data-theme-toggle data-label-light="Use light" data-label-dark="Use dark"><svg></svg></button><a class="header-language-link" href="https://xuesiyuan.com/">Language</a></header><h2 id="a b">Anchor</h2>';
  document.documentElement.append(body);
  document.getElementById('a b')!.scrollIntoView = () => { scrolled = true; };
  const link = document.querySelector('a')!;
  bindThemeLink(link as unknown as HTMLAnchorElement, link.getAttribute('href')!);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
 };
 return { window, document, mount, replacements, reads: () => reads, scrolled: () => scrolled,
  link: () => document.querySelector('a')!.getAttribute('href'),
  preference: () => (window as unknown as globalThis.Window).__siteTheme!.getPreference(),
  themeColor: () => document.querySelector('meta[name="theme-color"]')!,
  toggle: () => document.querySelector('svg')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true })),
  changeSystem: (dark: boolean) => { systemDark = dark; media.dispatchEvent(new window.Event('change')); },
  restore: (nextSaved: string | null, persisted = true) => {
   saved = nextSaved;
   const event = new window.Event('pageshow');
   Object.defineProperty(event, 'persisted', { value: persisted });
   window.dispatchEvent(event);
  },
  saved: () => saved,
 };
}

function expectTheme(f: ReturnType<typeof fixture>, dark: boolean) {
 const { document, window } = f;
 const color = dark ? '#1f1e1d' : '#f0eee6';
 expect(document.documentElement.classList.contains('u-mode-invert')).toBe(dark);
 expect(f.themeColor().getAttribute('content')).toBe(dark ? '#1f1e1d' : '#f0eee6');
 expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(1);
 expect(f.themeColor().hasAttribute('media')).toBe(false);
 expect(document.querySelector('meta[name="color-scheme"]')!.getAttribute('content')).toBe(dark ? 'dark' : 'light');
 expect(window.getComputedStyle(document.documentElement).colorScheme).toBe(dark ? 'dark' : 'light');
 for (const element of document.querySelectorAll('html, body, .header')) {
  expect(window.getComputedStyle(element).backgroundColor).toBe(color);
 }
 const button = document.querySelector('button');
 if (button) {
  expect(button.getAttribute('aria-pressed')).toBe(String(dark));
  expect(button.getAttribute('aria-label')).toBe(dark ? 'Use light' : 'Use dark');
 }
}

for (const [saved, systemDark, dark] of [
 ['dark', false, true], ['light', true, false], [null, true, true], [null, false, false], ['invalid', true, true],
] as const) {
 test(`head initialization before body respects saved=${saved}, systemDark=${systemDark}`, () => {
  const f = fixture(saved, systemDark);
  expectTheme(f, dark);
  f.mount(); expectTheme(f, dark);
 });
}

test('manual toggles replace the connected theme-color node on every change without accumulating tags', () => {
 const f = fixture(null, true); f.mount();
 for (const dark of [false, true, false, true]) {
  const previous = f.themeColor();
  f.toggle();
  expectTheme(f, dark);
  expect(f.themeColor()).not.toBe(previous);
  expect(previous.isConnected).toBe(false);
  expect(f.saved()).toBe(dark ? 'dark' : 'light');
 }
});

test('system changes update the theme until a manual choice takes precedence', () => {
 const f = fixture(); f.mount();
 f.changeSystem(true); expectTheme(f, true);
 f.changeSystem(false); expectTheme(f, false);
 expect(f.saved()).toBeNull();
 f.toggle(); expectTheme(f, true);
 f.changeSystem(true); f.changeSystem(false); expectTheme(f, true);
});

test('saved light preference is not overridden by system changes', () => {
 const f = fixture('light', true); f.mount();
 f.changeSystem(false); f.changeSystem(true); expectTheme(f, false);
});

test('blocked storage still follows system changes and retains a manual choice in memory', () => {
 const f = fixture(null, false, true); f.mount();
 f.changeSystem(true); expectTheme(f, true);
 f.toggle(); expectTheme(f, false);
 f.changeSystem(false); f.changeSystem(true); expectTheme(f, false);
 f.restore('dark'); expectTheme(f, false);
});

test('BFCache restore reads the latest preference and resumes system following when it was removed', () => {
 const f = fixture('light', true); f.mount();
 f.restore('dark'); expectTheme(f, true);
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=dark');
 f.restore(null); expectTheme(f, true);
 expect(f.link()).toBe('https://xuesiyuan.com/');
 f.changeSystem(false); expectTheme(f, false);
});

for (const mode of ['dark', 'light'] as const) test(`${mode} hint takes precedence before body, saves, cleans history and updates links`, () => {
 const f = fixture(mode === 'dark' ? 'light' : 'dark', mode === 'light', false, `#theme=${mode}`);
 expect(f.document.body).toBeNull();
 expectTheme(f, mode === 'dark');
 expect(f.saved()).toBe(mode);
 expect(f.reads()).toBe(0);
 expect(f.preference()).toBe(mode);
 expect(f.window.location.href).toBe('https://example.test/essay/a/?keep=yes');
 expect(f.window.history.state).toEqual({ preserved: 42 });
 expect(f.window.history.length).toBe(1);
 expect(f.replacements).toEqual(['/essay/a/?keep=yes']);
 f.mount();
 expect(f.link()).toBe(`https://xuesiyuan.com/#theme=${mode}`);
 f.changeSystem(mode !== 'dark'); expectTheme(f, mode === 'dark');
 f.toggle();
 expect(f.link()).toBe(`https://xuesiyuan.com/#theme=${mode === 'dark' ? 'light' : 'dark'}`);
});

test('cleaning a valid hint preserves raw anchor/other tokens and scrolls after the target mounts', () => {
 const f = fixture(null, false, false, '#a%20b&theme=dark&other=%20');
 expect(f.window.location.hash).toBe('#a%20b&other=%20');
 expect(f.scrolled()).toBe(false);
 f.mount(); expect(f.scrolled()).toBe(true);
});

test('invalid and duplicate hints leave URL/history/storage alone', () => {
 for (const hash of ['#theme=Dark', '#theme=system', '#theme=dark&theme=light', '#theme=%XX', '#Theme=dark']) {
  const f = fixture('light', true, false, hash);
  expectTheme(f, false);
  expect(f.window.location.hash).toBe(hash);
  expect(f.saved()).toBe('light');
  expect(f.replacements).toEqual([]);
 }
});

for (const blocked of [true, 'write'] as const) test(`hint and manual choices survive ${blocked} storage failures and BFCache`, () => {
 const f = fixture('light', false, blocked, '#theme=dark'); f.mount();
 expectTheme(f, true);
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=dark');
 f.restore('light'); expectTheme(f, true);
 f.toggle(); expectTheme(f, false);
 f.restore('dark'); expectTheme(f, false);
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=light');
});

test('system following carries no hint on load or system changes; history errors preserve working controls', () => {
 const f = fixture(null, true); f.mount();
 expect(f.link()).toBe('https://xuesiyuan.com/');
 f.changeSystem(false);
 expect(f.link()).toBe('https://xuesiyuan.com/');
 const restricted = fixture(null, false, false, '#theme=dark', true); restricted.mount();
 expectTheme(restricted, true);
 expect(restricted.window.location.hash).toBe('#theme=dark');
 restricted.toggle(); expectTheme(restricted, false);
});

test('a same-origin storage event refreshes the theme and outgoing link', () => {
 const f = fixture('light'); f.mount();
 f.restore('dark', false); // Change storage without the BFCache handler.
 f.window.dispatchEvent(new f.window.StorageEvent('storage', { key: 'color-mode' }));
 expectTheme(f, true);
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=dark');
 f.restore(null, false);
 const cleared = new f.window.Event('storage');
 Object.defineProperty(cleared, 'key', { value: null });
 f.window.dispatchEvent(cleared);
 expectTheme(f, false);
 expect(f.link()).toBe('https://xuesiyuan.com/');
});

test('invalid preferences follow system changes instead of pinning a theme', () => {
 const f = fixture('invalid'); f.mount();
 f.changeSystem(true); expectTheme(f, true);
});

test('header retains its opaque theme background and sticky layout with the sampling workaround', () => {
 const f = fixture(); f.mount();
 const header = f.document.querySelector('header')!;
 for (const dark of [false, true]) {
  if (dark) f.toggle();
  expectTheme(f, dark);
  const computed = f.window.getComputedStyle(header);
  expect(computed.position).toBe('sticky');
  expect(computed.top).toBe('0px');
  expect(computed.backdropFilter).toBe('blur(0px)');
 }
});
