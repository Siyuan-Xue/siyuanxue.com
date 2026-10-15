import type { Padding } from 'photoswipe';

/** Read the same resolved env() insets as CSS, including after device rotation. */
export function getSafeAreaInsets(): Padding {
 const css = typeof document === 'undefined' ? null : document.defaultView?.getComputedStyle(document.documentElement);
 const inset = (side: string) => Math.max(0, parseFloat(css?.getPropertyValue(`--safe-area-${side}`) ?? '') || 0);
 return { top: inset('top'), right: inset('right'), bottom: inset('bottom'), left: inset('left') };
}
