import { getEssays, getPosts } from '../utils/content';
import { locale, localeOrigin, t } from '../i18n/locale';
import { site } from '../data/site';
const escape = (text: string) => text.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export async function GET() {
 const origin = localeOrigin(locale);
 const entries = [...(await getEssays()).map(item => ({ ...item, kind: 'essay' })), ...(await getPosts()).map(item => ({ ...item, kind: 'post' }))].sort((a,b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf());
 const items = entries.map(({ slug, kind, entry }) => `<item><title>${escape(entry.data.title)}</title><description>${escape(entry.data.description)}</description><link>${origin}/${kind}/${slug}/</link><guid>${origin}/${kind}/${slug}/</guid><pubDate>${entry.data.date.toUTCString()}</pubDate></item>`).join('');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${escape(t(site.title))}</title><description>${escape(t(site.description))}</description><link>${origin}/</link><language>${locale === 'zh' ? 'zh-CN' : 'en'}</language>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
