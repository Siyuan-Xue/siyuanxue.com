import { locale, localeOrigin } from '../i18n/locale';
export function GET() { return new Response(`User-agent: *\nAllow: /\nDisallow: /wip/\nSitemap: ${localeOrigin(locale)}/sitemap-index.xml\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); }
