import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { pairGalleries } from './gallery';
export const GALLERY_PREVIEW_SLUG = 'layout-preview';
const isPreview = (entry: { id: string }) => entry.id.startsWith(`${GALLERY_PREVIEW_SLUG}/`);
export async function getGalleries(includeDrafts = false) {
 return pairGalleries((await getCollection('gallery')).filter(entry => !isPreview(entry)), locale, includeDrafts);
}
/** The designated layout sample is public for review; ordinary drafts stay private. */
export async function getGalleryPages(includeDrafts = false) {
 const entries = await getCollection('gallery');
 return [
  ...pairGalleries(entries.filter(entry => !isPreview(entry)), locale, includeDrafts),
  ...pairGalleries(entries.filter(isPreview), locale, true),
 ];
}
