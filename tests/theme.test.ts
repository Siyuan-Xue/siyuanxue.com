import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { Window } from 'happy-dom';

const script = readFileSync(new URL('../src/scripts/theme.js', import.meta.url), 'utf8');
const head = readFileSync(new URL('../src/components/BaseHead.astro', import.meta.url), 'utf8');
const styles = ['tokens', 'base'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8').replace(/^@import .*;$/gm, '')).join('\n');
const windows: Window[] = [];
afterEach(() => { for (const window of windows.splice(0)) window.happyDOM.abort(); });

function fixture(saved: string | null = null, systemDark = false, blocked = false) {
 const window = new Window({ url: 'https://example.test/' });
 windows.push(window);
 const { document } = window;
 document.head.innerHTML = head.match(/<meta name="(?:theme-color|color-scheme)"[^>]*>/g)!.join('') + `<style>${styles}</style>`;
 document.body.remove(); // The blocking head script runs before body or controls exist.
 const media = new window.EventTarget();
 Object.defineProperty(media, 'matches', { get: () => systemDark });
 const context = createContext({ document, window, matchMedia: () => media, localStorage: {
  getItem: () => { if (blocked) throw new Error('SecurityError'); return saved; },
  setItem: (_key: string, value: string) => { if (blocked) throw new Error('SecurityError'); saved = value; },
 } });
 runInContext(script, context);
 const mount = () => {
  const body = document.createElement('body');
  body.innerHTML = '<header class="header" data-scroll-header><button data-theme-toggle data-label-light="Use light" data-label-dark="Use dark"><svg></svg></button></header>';
  document.documentElement.append(body);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
 };
 return { window, document, mount,
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
 f.restore(null); expectTheme(f, true);
 f.changeSystem(false); expectTheme(f, false);
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
