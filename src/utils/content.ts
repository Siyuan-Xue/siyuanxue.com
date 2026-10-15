import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { pairEntries } from './contentPairs';
import { mergeBlogEntries } from './blog';
export async function getEssays() { return pairEntries(await getCollection('essay'), locale); }
export async function getPosts() { return pairEntries(await getCollection('post'), locale); }
export async function getBlog() {
 const [essays, posts] = await Promise.all([getEssays(), getPosts()]);
 return mergeBlogEntries(essays, posts);
}
