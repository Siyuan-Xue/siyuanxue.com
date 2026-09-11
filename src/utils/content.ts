import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { pairEntries } from './contentPairs';
import type { Locale } from '../i18n/types';
export async function getEssays() { return pairEntries(await getCollection('essay'), locale); }
export async function getPosts() { return pairEntries(await getCollection('post'), locale); }
export function formatDate(date: Date, language: Locale = locale): string {
 return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
