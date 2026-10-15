import { afterEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';

const styles = ['theme-colors', 'tokens', 'prose', 'base', 'toc', 'article'].map(name => readFileSync(new URL(`../src/styles/${name}.css`, import.meta.url), 'utf8').replace(/^@import .*;$/gm, '')).join('\n');
const windows: Window[] = [];
afterEach(() => { for (const window of windows.splice(0)) window.happyDOM.abort(); });

function fixture(language = 'en', article = true, width = 1024) {
 const window = new Window({ width, height: 700 });
 windows.push(window);
 const { document } = window;
 document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
 document.documentElement.dataset.lang = language;
 document.documentElement.className = article ? 'prose-page' : '';
 document.head.innerHTML = `<style>${styles}</style>`;
 document.body.innerHTML = `<header class="header"><div class="container cc-narrow header-inner"><span class="header-name">Name</span></div></header>
  <nav class="toc-container"><h2 class="toc-title">Contents</h2><ul class="toc-list"><li class="toc-list_item"><a class="toc-link cc-active">First</a></li><li class="toc-list_item toc-list_item--h3"><a class="toc-link">Second</a></li></ul></nav>
  <article class="container cc-narrow"><header class="post-header"><h1 class="post-title">Title</h1><p class="post-subtitle">Subtitle</p><p class="post-date">October 2026</p></header><div class="prose"><p>Text <strong>bold</strong></p><h2 id="section">Section</h2><h3>Subsection</h3><blockquote><p>Quote</p></blockquote><ul><li>Item</li></ul><figure><figcaption>Caption</figcaption></figure></div></article>`;
 return { window, document, css: (selector: string) => window.getComputedStyle(document.querySelector(selector)!) };
}

for (const language of ['en', 'zh']) {
 test(`${language}: article typography overrides the shared cascade without changing other pages`, () => {
  const f = fixture(language);
  expect(f.css('body').fontSize).toBe('20px');
  expect(f.css('body').fontVariationSettings).toBe("'opsz' 24");
  expect(f.css('html').getPropertyValue('--narrow')).toBe('38.75rem');
  expect(f.css('.container').paddingLeft).toBe('20px');
  expect(f.css('.post-title').fontSize).toBe('62px');
  expect(f.css('.post-title').fontWeight).toBe('700');
  expect(f.css('.post-title').lineHeight).toBe('1.1');
  expect(f.css('.post-title').textWrap).toBe('balance');
  expect(f.css('.post-subtitle').fontSize).toBe('22px');
  expect(f.css('.post-subtitle').fontStyle).toBe(language === 'zh' ? 'normal' : 'italic');
  expect(f.css('.post-subtitle').color).toBe(f.css('body').color);
  expect(f.css('.post-subtitle').marginBottom).toBe('0px');
  expect(f.css('.post-date').fontSize).toBe('18px');
  expect(f.css('.prose strong').fontWeight).toBe('600');
  expect(f.css('.prose h2').fontSize).toBe('32px');
  expect(f.css('.prose h3').fontSize).toBe('24px');
  expect(Number(f.css('.toc-link:not(.cc-active)').opacity)).toBe(.5);
  expect(f.css('.toc-link.cc-active').opacity).toBe('1');
  expect(f.css('.toc-list_item--h3').paddingLeft).toBe('0px');
  expect(f.css('.prose blockquote').borderLeftWidth).toBe('1px');
  const other = fixture(language, false);
  expect(other.css('html').getPropertyValue('--narrow')).toBe('42rem');
  expect(other.css('.prose strong').fontWeight).toBe('700');
  expect(other.css('.post-subtitle').fontStyle).toBe('normal');
 });
 test(`${language}: phone article keeps 20px text, a 48px title and 20px side padding`, () => {
  const f = fixture(language, true, 390);
  expect(f.css('body').fontSize).toBe('20px');
  expect(f.css('.post-title').fontSize).toBe('48px');
  expect(f.css('.container').paddingLeft).toBe('20px');
  expect(f.css('.prose figcaption').fontSize).toBe('14.4px');
 });
}

test('native Markdown footnotes receive theme-aware chips and retain their real destinations', async () => {
 const processor = await createMarkdownProcessor();
 const result = await processor.render('A note[^one].\n\n[^one]: A source.');
 const f = fixture();
 f.document.querySelector('.prose')!.innerHTML = result.code;
 const ref = f.document.querySelector('a[data-footnote-ref]')!;
 expect(ref).not.toBeNull();
 expect(f.document.getElementById(ref.getAttribute('href')!.slice(1))).not.toBeNull();
 expect(f.css('[data-footnote-ref]').fontSize).toBe('12px');
 expect(f.css('[data-footnote-ref]').fontWeight).toBe('500');
 expect(f.css('[data-footnote-ref]').borderRadius).toBe('4px');
 expect(f.css('html').getPropertyValue('--article-footnote-bg')).toBe('rgb(0 0 0 / 8%)');
 f.document.documentElement.classList.add('u-mode-invert');
 expect(f.css('html').getPropertyValue('--article-footnote-bg')).toBe('rgb(255 255 255 / 15%)');
});
