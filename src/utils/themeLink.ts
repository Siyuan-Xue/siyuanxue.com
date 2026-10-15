import type { ThemePreference } from './themeHint';

declare global {
 interface Window {
  __siteTheme?: { getPreference(): ThemePreference | null; hintHref(href: string): string };
 }
}

/** Bind the real href, so keyboard, middle-click and the context menu all agree.
 * React calls this after hydration; its server-rendered href remains clean.
 */
export function bindThemeLink(link: HTMLAnchorElement, baseHref: string): () => void {
 const document = link.ownerDocument;
 const update = () => link.setAttribute('href', document.defaultView?.__siteTheme?.hintHref(baseHref) ?? baseHref);
 update();
 document.addEventListener('site-theme-change', update);
 return () => document.removeEventListener('site-theme-change', update);
}
