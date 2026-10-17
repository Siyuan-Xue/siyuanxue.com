import { getBlog } from '../utils/content';
import { languageTag, locale, localeOrigin, t } from '../i18n/locale';
import { site } from '../data/site';
import { BLOG_ENABLED } from '../features';
const escape = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export async function GET() {
 // An empty 404 tells the static build to write no rss.xml at all.
 if (!BLOG_ENABLED) return new Response(null, { status: 404 });
 const origin = localeOrigin(locale);
 const entries = await getBlog();
 const items = entries.map(({ href, entry }) => `<item><title>${escape(entry.data.title)}</title><description>${escape(entry.data.description)}</description><link>${origin}${href}</link><guid>${origin}${href}</guid><pubDate>${entry.data.date.toUTCString()}</pubDate></item>`).join('');
 // Derived from content, so an unchanged feed rebuilds byte-for-byte.
 const updated = Math.max(...entries.map(({ entry }) => (entry.data.updatedDate ?? entry.data.date).valueOf()));
 const lastBuildDate = entries.length ? `<lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>` : '';
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${escape(t(site.title))}</title><description>${escape(t(site.description))}</description><link>${origin}/</link><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/><language>${languageTag()}</language>${lastBuildDate}${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
