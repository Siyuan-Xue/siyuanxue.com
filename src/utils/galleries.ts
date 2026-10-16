import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { isGalleryPreview, pairGalleries, pairGalleryPages } from './gallery';
export async function getGalleries(includeDrafts = false) {
 return pairGalleries((await getCollection('gallery')).filter(entry => !isGalleryPreview(entry)), locale, includeDrafts);
}
export async function getGalleryPages(includeDrafts = false) {
 return pairGalleryPages(await getCollection('gallery'), locale, includeDrafts);
}
