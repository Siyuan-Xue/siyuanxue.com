import { expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { initRomanticPortrait } from '../src/utils/romanticPortraitFeature';
import { initRomanticPortraitController } from '../src/utils/romanticPortraitController';
import { createRomanticModeState } from '../src/utils/romanticMode';
import { labelRomanticLightboxDialog } from '../src/utils/romanticLightbox';

async function withPortrait(run: (root: HTMLElement, window: ReturnType<typeof parseHTML>['window']) => void | Promise<void>) {
 const { window, document } = parseHTML('<html><body><div data-romantic-mode data-secret-src="/images/romantic-placeholder-companion.webp" data-turn-on-label="Turn on" data-turn-off-label="Turn off" data-load-error="The image could not be loaded. Please try again."><button data-romantic-trigger><img data-primary-image></button><div data-primary-loading-slot></div><a data-secret-card data-romantic-lightbox-trigger hidden><span data-secret-image-slot></span></a><p data-romantic-error hidden></p></div></body></html>');
 const original = Object.getOwnPropertyDescriptors(globalThis);
 Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
 Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
 Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: (callback: FrameRequestCallback) => { callback(0); return 1; } });
 Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, value: () => {} });
 Object.assign(globalThis, { window, document, Element: window.Element, HTMLElement: window.HTMLElement, NodeList: window.NodeList });
 try { await run(document.querySelector<HTMLElement>('[data-romantic-mode]')!, window); }
 finally {
  for (const key of ['window','document','Element','HTMLElement','NodeList','matchMedia','sessionStorage','requestAnimationFrame','cancelAnimationFrame']) {
   if (original[key]) Object.defineProperty(globalThis, key, original[key]);
   else Reflect.deleteProperty(globalThis, key);
  }
 }
}

test('lazy feature reveals on its initial activation even when session storage is blocked', () => withPortrait(root => {
 initRomanticPortrait(root, createRomanticModeState(true));
 expect(root.classList.contains('is-active')).toBe(true);
 expect(root.querySelector('[data-secret-card]')?.hasAttribute('hidden')).toBe(false);
 expect(root.querySelector('[data-secret-image-slot] img')?.getAttribute('src')).toBe('/images/romantic-placeholder-companion.webp');
 root.querySelector<HTMLButtonElement>('[data-romantic-trigger]')!.click();
 expect(root.classList.contains('is-active')).toBe(false);
 expect(root.querySelector('[data-romantic-trigger]')?.getAttribute('aria-pressed')).toBe('false');
}));

test('a primary image that failed before lazy initialization leaves no permanent loader', () => withPortrait(root => {
 const primary = root.querySelector<HTMLImageElement>('[data-primary-image]')!;
 Object.defineProperties(primary, { complete: { value: true }, naturalWidth: { value: 0 } });
 initRomanticPortrait(root, createRomanticModeState(true));
 expect(root.querySelector('[data-primary-loading-slot]')?.classList.contains('is-loading')).toBe(false);
 expect(root.querySelector('[data-romantic-error]')?.textContent).toContain('Please try again');
 expect(root.classList.contains('is-active')).toBe(true);
}));

test('toggling a revealed card off and on retries its failed thumbnail', () => withPortrait((root, window) => {
 initRomanticPortrait(root, createRomanticModeState(true));
 const failed = root.querySelector<HTMLImageElement>('[data-secret-image-slot] img')!;
 failed.dispatchEvent(new window.Event('error'));
 expect(root.querySelector('[data-secret-card]')?.classList.contains('is-loading')).toBe(false);
 expect(root.querySelector('[data-romantic-error]')?.textContent).toContain('Please try again');
 const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]')!;
 trigger.click(); trigger.click();
 const retried = root.querySelector<HTMLImageElement>('[data-secret-image-slot] img')!;
 expect(retried === failed).toBe(false);
 expect(retried.getAttribute('src')).toBe('/images/romantic-placeholder-companion.webp');
 expect(root.querySelector('[data-secret-card]')?.classList.contains('is-loading')).toBe(true);
 retried.dispatchEvent(new window.Event('load'));
 expect(root.querySelector('[data-secret-card]')?.classList.contains('is-loading')).toBe(false);
 expect(root.querySelectorAll('[data-secret-image-slot] img').length).toBe(1);
 expect(root.querySelector<HTMLElement>('[data-romantic-error]')!.hidden).toBe(true);
 expect(trigger.getAttribute('aria-pressed')).toBe('true');
}));

for (const label of ['Romantic Mode illustration', '心动模式插画']) {
 test(`opened lightbox exposes its localized dialog name: ${label}`, () => {
  const { document } = parseHTML('<div class="pswp" role="dialog" tabindex="-1"></div>');
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  labelRomanticLightboxDialog(dialog, label);
  expect(dialog.getAttribute('aria-label')).toBe(label);
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  expect(dialog.getAttribute('role')).toBe('dialog');
 });
}

test('eager controller loads once on the first click and ignores old unlock data', () => withPortrait(async root => {
 root.dataset.storageKey = 'romantic-mode-unlocked-v1';
 initRomanticPortraitController(root);
 expect(root.classList.contains('is-active')).toBe(false);
 const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]')!;
 trigger.click();
 await new Promise(resolve => setTimeout(resolve, 20));
 expect(root.classList.contains('is-active')).toBe(true);
 expect(trigger.getAttribute('aria-expanded')).toBe('true');
 expect(root.querySelectorAll('[data-secret-image-slot] img').length).toBe(1);
 trigger.click();
 expect(root.classList.contains('is-active')).toBe(false);
}));

test('loading the primary photo does not clear a failed secondary photo', () => withPortrait((root, window) => {
 initRomanticPortrait(root, createRomanticModeState(true));
 root.querySelector('[data-secret-image-slot] img')!.dispatchEvent(new window.Event('error'));
 const error = root.querySelector<HTMLElement>('[data-romantic-error]')!;
 expect(error.hidden).toBe(false);
 root.querySelector('[data-primary-image]')!.dispatchEvent(new window.Event('load'));
 expect(error.hidden).toBe(false);
 expect(error.textContent).toContain('Please try again');
 const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]')!;
 trigger.click(); trigger.click();
 root.querySelector('[data-secret-image-slot] img')!.dispatchEvent(new window.Event('load'));
 expect(error.hidden).toBe(true);
}));
