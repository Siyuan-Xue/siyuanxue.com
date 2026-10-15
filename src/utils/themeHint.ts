export type ThemePreference = 'light' | 'dark';
export type PageStateHint = { theme?: ThemePreference; header?: 'open'; media?: 'shown' };

/** Self-contained: BaseHead serializes this factory into its blocking head script.
 * Historical name retained; this is the single parser for all three page-state hints.
 */
export function createThemeHint() {
 const preference = (value: unknown): ThemePreference | null => value === 'light' || value === 'dark' ? value : null;
 const keys = ['theme', 'header', 'media'] as const;
 const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return null; } };
 const parts = (hash: string) => hash.replace(/^#/, '').split('&');
 const keyOf = (part: string) => decode(part.split('=', 1)[0]);
 const valid = (key: string, value: unknown) => key === 'theme' ? preference(value) :
  key === 'header' && value === 'open' ? value : key === 'media' && value === 'shown' ? value : null;
 // Sending replaces all old known keys. Receiving passes only successfully parsed keys.
 const strip = (hash: string, consumed: readonly string[] = keys) => {
  const rest = parts(hash).filter(part => !consumed.includes(keyOf(part) ?? '')).join('&');
  return rest ? `#${rest}` : '';
 };
 const parse = (hash: string): PageStateHint => {
  const state: Record<string, string> = {};
  for (const key of keys) {
   const hints = parts(hash).filter(part => keyOf(part) === key);
   // Reject duplicates independently, including repeated identical or encoded keys.
   if (hints.length !== 1 || !hints[0].includes('=')) continue;
   const value = valid(key, decode(hints[0].slice(hints[0].indexOf('=') + 1)));
   if (value) state[key] = value;
  }
  return state as PageStateHint;
 };
 const href = (url: string, state: { theme?: unknown; header?: unknown; media?: unknown }) => {
  const index = url.indexOf('#');
  const base = index < 0 ? url : url.slice(0, index);
  let hash = index < 0 ? '' : strip(url.slice(index));
  for (const key of keys) {
   const value = valid(key, state[key]);
   if (value) hash += `${hash ? '&' : '#'}${key}=${value}`;
  }
  return base + hash;
 };
 // Other fragments stay byte-for-byte intact; the first bare token is the anchor.
 const anchor = (hash: string) => decode(parts(hash).find(part => part && !part.includes('=')) ?? '');
 return { preference, parse, strip, href, anchor };
}

/** Serialize compiled JS, never TypeScript source or a second helper implementation. */
export function inlineThemeScript(script: string): string {
 return `(${script}) ((${createThemeHint.toString()})());`;
}
