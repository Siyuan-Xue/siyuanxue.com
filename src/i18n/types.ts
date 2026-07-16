/** Bilingual string pair — always provide both locales. */
export type Bi = {
	en: string;
	zh: string;
};

export type Locale = 'en' | 'zh';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES: Locale[] = ['en', 'zh'];

export function bi(en: string, zh: string): Bi {
	return { en, zh };
}
