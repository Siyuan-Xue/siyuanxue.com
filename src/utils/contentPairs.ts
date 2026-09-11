import type { Locale } from '../i18n/types';
type Entry = { id: string; data: { date: Date; draft: boolean } };
export function pairEntries<T extends Entry>(entries: T[], locale: Locale): { slug: string; entry: T }[] {
 const groups = new Map<string, Partial<Record<Locale, T>>>();
 for (const entry of entries) {
  const match = entry.id.match(/^(.+)\/(en|zh)$/);
  if (!match) throw new Error(`Invalid content locale id: ${entry.id}`);
  const [, slug, lang] = match;
  const bucket = groups.get(slug) ?? {};
  if (bucket[lang as Locale]) throw new Error(`Duplicate locale entry: ${entry.id}`);
  bucket[lang as Locale] = entry;
  groups.set(slug, bucket);
 }
 const result: { slug: string; entry: T }[] = [];
 for (const [slug, { en, zh }] of groups) {
  if (en?.data.draft || zh?.data.draft) continue;
  if (!en || !zh) throw new Error(`Missing translation for ${slug}`);
  if (en.data.date.valueOf() !== zh.data.date.valueOf()) throw new Error(`Mismatched publication date for ${slug}`);
  result.push({ slug, entry: locale === 'en' ? en : zh });
 }
 return result.sort((a, b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf());
}
