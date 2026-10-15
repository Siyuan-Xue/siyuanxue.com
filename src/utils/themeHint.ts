export type ThemePreference = 'light' | 'dark';

/** Self-contained: BaseHead serializes this factory into its blocking head script.
 * Keep all runtime dependencies inside it; tests also execute the built inline copy.
 */
export function createThemeHint() {
 const preference = (value: unknown): ThemePreference | null => value === 'light' || value === 'dark' ? value : null;
 const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return null; } };
 const parts = (hash: string) => hash.replace(/^#/, '').split('&');
 const isTheme = (part: string) => decode(part.split('=', 1)[0]) === 'theme';
 const strip = (hash: string) => {
  const rest = parts(hash).filter(part => !isTheme(part)).join('&');
  return rest ? `#${rest}` : '';
 };
 const parse = (hash: string): ThemePreference | null => {
  const hints = parts(hash).filter(isTheme);
  // Reject ambiguous duplicates, including repeated identical values.
  if (hints.length !== 1 || !hints[0].includes('=')) return null;
  return preference(decode(hints[0].slice(hints[0].indexOf('=') + 1)));
 };
 const href = (url: string, mode: unknown) => {
  const index = url.indexOf('#');
  const base = index < 0 ? url : url.slice(0, index);
  const hash = index < 0 ? '' : strip(url.slice(index));
  const value = preference(mode);
  return base + hash + (value ? `${hash ? '&' : '#'}theme=${value}` : '');
 };
 // Other fragments stay byte-for-byte intact; the first bare token is the anchor.
 const anchor = (hash: string) => decode(parts(hash).find(part => part && !part.includes('=')) ?? '');
 return { preference, parse, strip, href, anchor };
}

/** Serialize compiled JS, never TypeScript source or a second helper implementation. */
export function inlineThemeScript(script: string): string {
 return `(${script}) ((${createThemeHint.toString()})());`;
}
