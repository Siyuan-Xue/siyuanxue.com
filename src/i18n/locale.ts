import type { Locale, Bi } from './types';
export function resolveLocale(value: string | undefined): Locale {
 if (value === undefined) return 'en';
 if (value === 'en' || value === 'zh') return value;
 throw new Error(`Invalid SITE_LOCALE: ${value}; expected en or zh`);
}
export const locale = resolveLocale(import.meta.env?.SITE_LOCALE ?? process.env.SITE_LOCALE);
export function localeOrigin(value: Locale): string { return value === 'en' ? 'https://siyuanxue.com' : 'https://xuesiyuan.com'; }
export function t(value: Bi): string { return value[locale]; }
