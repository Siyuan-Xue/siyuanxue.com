import { localeOrigin } from '../i18n/locale';
import type { Locale } from '../i18n/types';

export interface LanguageRoute { locale: Locale; path: string; published: boolean }
export interface LanguageSwitch { href: string; lang: 'en' | 'zh-CN'; label: string }

/** Path-only input: never carry queries, fragments, host aliases or visitor state. */
export function languageSwitch(path: string, from: Locale, routes: readonly LanguageRoute[]): LanguageSwitch {
 const other = from === 'en' ? 'zh' : 'en';
 const pathname = path.split(/[?#]/, 1)[0];
 const normalized = pathname.startsWith('/') && !pathname.startsWith('//') && !pathname.includes('\\')
  ? `${pathname.replace(/\/+$/, '')}/` : '/';
 const available = (locale: Locale) => routes.some(route => route.locale === locale && route.path === normalized && route.published);
 const target = available(from) && available(other) ? normalized : '/';
 return {
  href: `${localeOrigin(other)}${target}`,
  lang: other === 'zh' ? 'zh-CN' : 'en',
  label: other === 'zh' ? 'Switch to 中文' : '切换到 English',
 };
}
