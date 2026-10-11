import { getCollection } from 'astro:content';
import { mkdir, writeFile } from 'node:fs/promises';
import { locale } from '../i18n/locale';
import { buildDiscoveryInventory, type DiscoveryPage } from './discovery';

let productionInventory: Promise<DiscoveryPage[]> | undefined;
export async function getDiscoveryInventory(): Promise<DiscoveryPage[]> {
 const collect = async () => {
  const [essay, post, gallery] = await Promise.all([getCollection('essay'), getCollection('post'), getCollection('gallery')]);
  const inventory = buildDiscoveryInventory({ essay, post, gallery }, locale, import.meta.env.DEV);
  if (import.meta.env.PROD) {
   await mkdir('.build/discovery', { recursive: true });
   await writeFile(`.build/discovery/${locale}.json`, JSON.stringify(inventory, null, 2));
  }
  return inventory;
 };
 return import.meta.env.DEV ? collect() : (productionInventory ??= collect());
}
export async function getDiscoveryPage(pathname: string): Promise<DiscoveryPage> {
 const path = pathname.replace(/\/404(?:\.html)?\/?$/, '/404/').replace(/\/?$/, '/');
 const page = (await getDiscoveryInventory()).find(page => page.path === path);
 if (!page) throw new Error(`Unregistered page ${path}; add a discovery policy before publishing`);
 return page;
}
