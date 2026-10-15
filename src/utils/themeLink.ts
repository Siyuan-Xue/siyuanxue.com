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
 const events = ['site-theme-change', 'headeractionschange', 'portraitchange'];
 for (const event of events) document.addEventListener(event, update);
 document.defaultView?.addEventListener('pageshow', update);
 return () => {
  for (const event of events) document.removeEventListener(event, update);
  document.defaultView?.removeEventListener('pageshow', update);
 };
}
