import { expect, test } from 'bun:test';
import { languageSwitch, type LanguageRoute } from '../src/utils/langSwitch';
import { localeOrigin } from '../src/i18n/locale';

const routes: LanguageRoute[] = (['en', 'zh'] as const).flatMap(locale =>
 ['/', '/chat/', '/wip/', '/essay/a-long-slug/', '/post/a-note/', '/gallery/pixeldone/'].map(path => ({ locale, path, published: true })));
routes.push(
 { locale: 'en', path: '/essay/english-only/', published: true },
 { locale: 'zh', path: '/gallery/chinese-only/', published: true },
 { locale: 'en', path: '/gallery/draft/', published: true },
 { locale: 'zh', path: '/gallery/draft/', published: false },
 { locale: 'en', path: '/post/unpublished/', published: false },
 { locale: 'zh', path: '/post/unpublished/', published: false },
);
for (const from of ['en', 'zh'] as const) {
 const other = from === 'en' ? 'zh' : 'en';
 for (const path of ['/', '/chat/', '/wip/', '/essay/a-long-slug/', '/post/a-note/', '/gallery/pixeldone/']) {
  test(`${from}: ${path} maps only to the published counterpart`, () => {
   const result = languageSwitch(path, from, routes);
   expect(result.href).toBe(localeOrigin(other) + path);
   expect(result.lang).toBe(other === 'zh' ? 'zh-CN' : 'en');
   expect(result.text).toBe(other === 'zh' ? '中文' : 'English');
   expect(result.label).toContain(result.text);
   if (path !== '/') expect(languageSwitch(path.slice(0, -1), from, routes)).toEqual(result);
   expect(languageSwitch(path + '?theme=dark&utm_source=test#section', from, routes)).toEqual(result);
   expect(languageSwitch(path + '#section?private=value', from, routes)).toEqual(result);
  });
 }
 for (const path of ['/essay/english-only/', '/gallery/chinese-only/', '/gallery/draft/', '/post/unpublished/', '/404.html', '/404/', '/unknown/', '//evil.test/', '/\\evil.test/', 'https://evil.test/']) {
  test(`${from}: ${path} falls back to the other home`, () => {
   expect(languageSwitch(path, from, routes).href).toBe(localeOrigin(other) + '/');
  });
 }
}
