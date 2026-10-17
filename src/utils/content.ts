import { getCollection } from 'astro:content';
import { locale } from '../i18n/locale';
import { pairEntries } from './contentPairs';
import { mergeBlogEntries } from './blog';
import { BLOG_ENABLED } from '../features';
// Pairs are validated in both modes; with the blog off nothing is published.
export async function getEssays() { const essays = pairEntries(await getCollection('essay'), locale); return BLOG_ENABLED ? essays : []; }
export async function getPosts() { const posts = pairEntries(await getCollection('post'), locale); return BLOG_ENABLED ? posts : []; }
export async function getBlog() {
 const [essays, posts] = await Promise.all([getEssays(), getPosts()]);
 return mergeBlogEntries(essays, posts);
}
