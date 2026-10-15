import type { Locale } from '../i18n/types';

type LocaleEntry = { id: string };
export type LocalePair<T> = { slug: string; en?: T; zh?: T };

/** Group `<slug>/<locale>` collection ids; both content and gallery pairing start here. */
export function groupLocalePairs<T extends LocaleEntry>(entries: T[], kind: 'content' | 'gallery', slugPattern = '.+'): LocalePair<T>[] {
 const id = new RegExp(`^(${slugPattern})\\/(en|zh)$`);
 const label = kind === 'gallery' ? 'gallery ' : '';
 const groups = new Map<string, LocalePair<T>>();
 for (const entry of entries) {
  const match = id.exec(entry.id);
  if (!match) throw new Error(`Invalid ${kind} locale id: ${entry.id}`);
  const [, slug, lang] = match as unknown as [string, string, Locale];
  const pair = groups.get(slug) ?? { slug };
  if (pair[lang]) throw new Error(`Duplicate ${label}locale entry: ${entry.id}`);
  pair[lang] = entry;
  groups.set(slug, pair);
 }
 return [...groups.values()];
}

/** Both translations of a published pair are required; a draft in either language hides it. */
export function requireBoth<T>({ slug, en, zh }: LocalePair<T>, kind: 'content' | 'gallery'): { en: T; zh: T } {
 if (!en || !zh) throw new Error(`Missing translation for ${kind === 'gallery' ? 'gallery ' : ''}${slug}`);
 return { en, zh };
}

type Entry = { id: string; data: { date: Date; draft: boolean } };
export function pairEntries<T extends Entry>(entries: T[], locale: Locale): { slug: string; entry: T }[] {
 const result: { slug: string; entry: T }[] = [];
 for (const pair of groupLocalePairs(entries, 'content')) {
  if (pair.en?.data.draft || pair.zh?.data.draft) continue;
  const { en, zh } = requireBoth(pair, 'content');
  if (en.data.date.valueOf() !== zh.data.date.valueOf()) throw new Error(`Mismatched publication date for ${pair.slug}`);
  result.push({ slug: pair.slug, entry: locale === 'en' ? en : zh });
 }
 return result.sort((a, b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf());
}
