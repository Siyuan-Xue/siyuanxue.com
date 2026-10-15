import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { Window } from 'happy-dom';
import { inlineThemeScript } from '../src/utils/themeHint';
import { bindHeaderActions } from '../src/utils/headerActions';
import { bindThemeLink } from '../src/utils/themeLink';

const script = inlineThemeScript(readFileSync(new URL('../src/scripts/theme.js', import.meta.url), 'utf8'));
const head = readFileSync(new URL('../src/components/BaseHead.astro', import.meta.url), 'utf8');
const styles = ['theme-colors', 'tokens', 'base'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8').replace(/^@import .*;$/gm, '')).join('\n');
const windows: Window[] = [];
afterEach(() => { for (const window of windows.splice(0)) window.happyDOM.abort(); });

function fixture(saved: string | null = null, systemDark = false, blocked: boolean | 'write' = false, hash = '', historyBlocked = false, userAgent = '') {
 const window = new Window({ url: `https://example.test/essay/a/?keep=yes${hash}`, settings: { navigator: { userAgent } } });
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
  systemDark: () => systemDark,
  themeColor: () => document.querySelector(`meta[name="theme-color"]:not([media]), meta[name="theme-color"][media="(prefers-color-scheme: ${systemDark ? 'dark' : 'light'})"]`)!,
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
 const override = f.preference() !== null && dark !== f.systemDark();
 expect(document.querySelectorAll('meta[name="theme-color"]').length).toBe(override ? 1 : 2);
 expect(f.themeColor().hasAttribute('media')).toBe(!override);
 expect(document.documentElement.dataset.theme).toBe(dark ? 'dark' : 'light');
 expect(document.documentElement.style.backgroundColor).toBe(color);
 expect(document.documentElement.style.colorScheme).toBe(dark ? 'dark' : 'light');
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

test('manual toggles alternate the system pair and unconditional override without accumulating tags', () => {
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

for (const [device, userAgent, filter] of [
 ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1', 'none'],
 ['Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/27.0 Safari/605.1.15', 'blur(0px)'],
 ['iPad', 'Mozilla/5.0 (iPad; CPU OS 27_0 like Mac OS X) AppleWebKit/605.1.15 Version/27.0 Mobile/15E148 Safari/604.1', 'blur(0px)'],
 ['Android', 'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36', 'blur(0px)'],
] as const) test(`${device} keeps an opaque sticky header with its platform-specific edge sampling`, () => {
 const f = fixture(null, false, false, '', false, userAgent); f.mount();
 const header = f.document.querySelector('header')!;
 for (const dark of [true, false, true]) {
  f.toggle();
  expectTheme(f, dark);
  const computed = f.window.getComputedStyle(header);
  expect(computed.position).toBe('sticky');
  expect(computed.top).toBe('0px');
  expect(computed.backdropFilter).toBe(filter);
 }
});


test('head prepares incoming SSR header/portrait semantics before deferred controllers, consumes only valid keys', async () => {
 const f = fixture('light', false, false, '#a%20b&theme=dark&header=open&media=shown&unknown=%2f');
 expect(f.document.documentElement.dataset.headerHint).toBe('open');
 expect(f.document.documentElement.dataset.mediaHint).toBe('shown');
 expect(f.window.location.hash).toBe('#a%20b&unknown=%2f');
 f.document.documentElement.insertAdjacentHTML('beforeend', `<body><header><div data-header-actions data-actions-expanded="false"><div data-actions-panel></div><button data-actions-toggle data-hide-label="Hide actions" aria-expanded="false"></button></div></header><div data-romantic-mode data-turn-off-label="Hide image"><button data-romantic-trigger aria-expanded="false"></button><a data-secret-card hidden></a></div></body>`);
 await f.window.happyDOM.waitUntilComplete();
 const toggle = f.document.querySelector<import('happy-dom').HTMLButtonElement>('[data-actions-toggle]')!;
 expect(toggle.getAttribute('aria-expanded')).toBe('true');
 expect(toggle.getAttribute('aria-label')).toBe('Hide actions');
 expect(f.document.querySelector<import('happy-dom').HTMLElement>('[data-actions-panel]')!.inert).toBe(false);
 expect(f.document.querySelector<import('happy-dom').HTMLElement>('[data-actions-panel]')!.getAttribute('aria-hidden')).toBe('false');
 expect(f.document.querySelector('[data-romantic-mode]')!.classList.contains('is-active')).toBe(true);
 expect(f.document.querySelector('[data-romantic-trigger]')!.getAttribute('aria-expanded')).toBe('true');
 expect(f.document.querySelector('[data-romantic-trigger]')!.getAttribute('aria-pressed')).toBe('true');
 expect(f.document.querySelector('[data-romantic-trigger]')!.getAttribute('aria-label')).toBe('Hide image');
 expect(f.document.querySelector<import('happy-dom').HTMLElement>('[data-secret-card]')!.hidden).toBe(false);
 expect(f.document.querySelector<import('happy-dom').HTMLElement>('[data-secret-card]')!.classList.contains('is-loading')).toBe(true);
});

test('mixed invalid and duplicate keys remain byte-for-byte while a valid layout key is consumed', () => {
 const f = fixture(null, false, false, '#theme=Dark&header=open&media=shown&media=shown&x=%2f');
 expect(f.window.location.hash).toBe('#theme=Dark&media=shown&media=shown&x=%2f');
 expect(f.document.documentElement.dataset.headerHint).toBe('open');
 expect(f.document.documentElement.dataset.mediaHint).toBeUndefined();
 expect(f.saved()).toBeNull();
});

test('language href tracks real header toggles, portrait events, theme, storage, pageshow and cleanup', () => {
 const f = fixture(); f.mount();
 const header = f.document.querySelector('header')!;
 header.insertAdjacentHTML('beforeend', '<div data-header-actions><div data-actions-panel></div><button data-actions-toggle></button></div>');
 f.document.body.insertAdjacentHTML('beforeend', '<div data-romantic-mode><button data-romantic-trigger aria-expanded="false"></button></div>');
 const cleanupHeader = bindHeaderActions(f.document.querySelector('[data-header-actions]') as unknown as HTMLElement);
 const toggle = f.document.querySelector<import('happy-dom').HTMLButtonElement>('[data-actions-toggle]')!;
 const portrait = f.document.querySelector('[data-romantic-trigger]')!;
 toggle.click();
 expect(f.link()).toBe('https://xuesiyuan.com/#header=open');
 portrait.setAttribute('aria-expanded', 'true');
 f.document.dispatchEvent(new f.window.Event('portraitchange'));
 expect(f.link()).toBe('https://xuesiyuan.com/#header=open&media=shown');
 toggle.click();
 expect(f.link()).toBe('https://xuesiyuan.com/#media=shown');
 f.toggle();
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=dark&media=shown');
 f.restore('light');
 expect(f.link()).toBe('https://xuesiyuan.com/#theme=light&media=shown');
 f.restore(null, false);
 f.window.dispatchEvent(new f.window.StorageEvent('storage', { key: 'color-mode' }));
 expect(f.link()).toBe('https://xuesiyuan.com/#media=shown');
 portrait.setAttribute('aria-expanded', 'false');
 f.window.dispatchEvent(new f.window.Event('pageshow'));
 expect(f.link()).toBe('https://xuesiyuan.com/');
 cleanupHeader();
});


test('system pair survives matching preferences and is restored when an override starts matching', () => {
 const f = fixture('dark', true); f.mount();
 const pair = [...f.document.querySelectorAll('meta[name="theme-color"]')];
 expectTheme(f, true);
 f.changeSystem(false); expectTheme(f, true);
 expect(pair.every(meta => !meta.isConnected)).toBe(true);
 f.changeSystem(true); expectTheme(f, true);
 expect([...f.document.querySelectorAll('meta[name="theme-color"]')]).toEqual(pair);
 f.restore(null); expectTheme(f, true);
 f.changeSystem(false); expectTheme(f, false);
 expect([...f.document.querySelectorAll('meta[name="theme-color"]')]).toEqual(pair);
});

test('root canvas and scheme do not depend on external CSS on every theme entry path', () => {
 const f = fixture('light', true, false, '#theme=dark');
 f.document.querySelector('style')!.remove();
 const check = (dark: boolean) => {
  const computed = f.window.getComputedStyle(f.document.documentElement);
  expect(computed.backgroundColor).toBe(dark ? '#1f1e1d' : '#f0eee6');
  expect(computed.colorScheme).toBe(dark ? 'dark' : 'light');
 };
 check(true); f.mount(); f.toggle(); check(false);
 f.restore('dark'); check(true);
 f.restore(null); f.changeSystem(false); check(false);
 f.restore('dark', false);
 f.window.dispatchEvent(new f.window.StorageEvent('storage', { key: 'color-mode' })); check(true);
});

test('critical palette precedes the blocking script and no-JS dark palette matches explicit dark', () => {
 expect(head.indexOf('set:html={themeColors}')).toBeLessThan(head.indexOf('set:html={inlineThemeScript'));
 const css = readFileSync(new URL('../src/styles/theme-colors.css', import.meta.url), 'utf8');
 expect(css.match(/html\.u-mode-invert \{([^}]+)\}/)![1]).toBe(css.match(/:root:not\(\[data-theme\]\) \{([^}]+)\}/)![1]);
});
