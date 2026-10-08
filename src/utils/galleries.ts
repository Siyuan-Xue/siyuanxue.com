import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { pairGalleries } from './gallery';
export async function getGalleries(includeDrafts = false) {
 return pairGalleries(await getCollection('gallery'), locale, includeDrafts);
}
