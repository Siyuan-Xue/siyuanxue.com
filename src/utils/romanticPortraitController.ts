import { createRomanticModeState } from './romanticMode';

export function initRomanticPortraitController(root: HTMLElement) {
 const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]');
 const errorMessage = root.querySelector<HTMLElement>('[data-romantic-error]');
 const image = root.querySelector<HTMLImageElement>('[data-primary-image]');
 const slot = root.querySelector<HTMLElement>('[data-primary-loading-slot]');
 if (!trigger || !errorMessage || !image || root.dataset.initialized) return;
 root.dataset.initialized = 'true';
 const finish = () => slot?.classList.remove('is-loading');
 if (image.complete) finish();
 else {
  slot?.classList.add('is-loading');
  image.addEventListener('load', finish, { once: true });
  image.addEventListener('error', finish, { once: true });
 }
 let loading = false;
 const activate = async () => {
  if (loading) return;
  loading = true;
  trigger.setAttribute('aria-busy', 'true');
  errorMessage.textContent = '';
  errorMessage.hidden = true;
  try {
   const { initRomanticPortrait } = await import('./romanticPortraitFeature');
   initRomanticPortrait(root, createRomanticModeState(true));
   trigger.removeEventListener('click', activate);
  } catch {
   errorMessage.textContent = root.dataset.loadError ?? '';
   errorMessage.hidden = false;
  } finally {
   loading = false;
   trigger.removeAttribute('aria-busy');
  }
 };
 trigger.addEventListener('click', activate);
}
