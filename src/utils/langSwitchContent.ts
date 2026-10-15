import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { buildDiscoveryInventory } from './discovery';
import { languageSwitch, type LanguageRoute } from './langSwitch';

let productionRoutes: Promise<LanguageRoute[]> | undefined;
async function collectRoutes(): Promise<LanguageRoute[]> {
 const [essay, post, gallery] = await Promise.all([getCollection('essay'), getCollection('post'), getCollection('gallery')]);
 const sources = { essay, post, gallery };
 return (['en', 'zh'] as const).flatMap(language => buildDiscoveryInventory(sources, language, import.meta.env.DEV).map(page => {
  const kind = page.kind;
  const entry = kind === 'essay' || kind === 'post' || kind === 'gallery'
   ? sources[kind].find(entry => entry.id === `${page.path.slice(kind.length + 2, -1)}/${language}`) : undefined;
  return { locale: language, path: page.path, published: page.kind !== 'not-found' && !entry?.data.draft };
 }));
}

/** Server/build only. React receives one resolved URL, never the content inventory. */
export async function getLanguageSwitch(path: string) {
 const routes = await (import.meta.env.DEV ? collectRoutes() : (productionRoutes ??= collectRoutes()));
 return languageSwitch(path, locale, routes);
}
