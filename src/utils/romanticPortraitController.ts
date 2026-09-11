import { advanceRomanticMode, persistRomanticMode, restoreRomanticMode, type RomanticModeStorage } from './romanticMode';
export function initRomanticPortraitController(root: HTMLElement) {
 const trigger = root.querySelector<HTMLButtonElement>('[data-romantic-trigger]');
 const status = root.querySelector<HTMLElement>('[data-romantic-status]');
 const image = root.querySelector<HTMLImageElement>('[data-primary-image]');
 const slot = root.querySelector<HTMLElement>('[data-primary-loading-slot]');
 if (!trigger || !status || !image) return;
 const finish = () => slot?.classList.remove('is-loading');
 if (image.complete) finish(); else { slot?.classList.add('is-loading'); image.addEventListener('load', finish, { once: true }); image.addEventListener('error', finish, { once: true }); }
 let storage: RomanticModeStorage | null = null;
 try { storage = sessionStorage; } catch {}
 let state = restoreRomanticMode(storage, root.dataset.storageKey);
 let loading = false;
 let timer: ReturnType<typeof setTimeout> | undefined;
 const announce = (text: string) => { clearTimeout(timer); status.textContent = text; status.classList.add('is-visible'); timer = setTimeout(() => { status.classList.remove('is-visible'); status.textContent = ''; }, 3600); };
 const load = async () => {
  if (loading) return;
  loading = true;
  trigger.setAttribute('aria-busy', 'true');
  try {
   const { initRomanticPortrait } = await import('./romanticPortraitFeature');
   initRomanticPortrait(root, state);
   trigger.removeEventListener('click', activate);
  } catch { announce(root.dataset.loadError ?? ''); loading = false; }
  finally { trigger.removeAttribute('aria-busy'); }
 };
 const activate = () => {
  if (state.unlocked) { void load(); return; }
  const step = advanceRomanticMode(state); state = step.state;
  if (step.shouldAnnounce) announce(root.dataset[`status${state.activationCount}`] ?? '');
  if (step.unlockedNow) { persistRomanticMode(storage, state, root.dataset.storageKey); void load(); }
 };
 trigger.addEventListener('click', activate);
 if (state.unlocked) void load();
}
