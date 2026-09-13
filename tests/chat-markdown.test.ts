import {expect,test} from 'bun:test';
import {parseHTML} from 'linkedom';
import {renderChatMarkdown, copyChatText} from '../src/utils/chat-markdown';
const render=(text:string)=>{const {document}=parseHTML('<html><body><article></article></body></html>'); const node=document.querySelector('article')!; renderChatMarkdown(node,text,{codeCopy:'Copy code'}); return node;};
test('renders rich answer structure and copyable code as safe DOM',()=>{
 const node=render('# Heading\n\nA **strong** and *soft* answer with `code`.\n\n- One\n- Two\n\n> Quote\n\n[link](https://example.com)\n\n```js\nconst x = "<div>";\n```\n\n| A | B |\n|---|---|\n| 1 | 2 |');
 expect(node.querySelector('h2')?.textContent).toBe('Heading'); expect(node.querySelectorAll('li').length).toBe(2); expect(node.querySelector('strong')?.textContent).toBe('strong'); expect(node.querySelector('blockquote')?.textContent).toContain('Quote'); expect(node.querySelector('table')).not.toBeNull();
 expect(node.querySelector('pre code')?.textContent).toBe('const x = "<div>";'); expect(node.querySelector('[data-code-copy]')?.getAttribute('aria-label')).toBe('Copy code');
 expect(node.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
});
test('raw HTML, images, hostile URLs and attribute payloads cannot introduce executable elements',()=>{
 const node=render('<script>alert(1)</script>\n\n<iframe src="https://evil.test"></iframe>\n\n<form><input></form>\n\n![tracking](https://evil.test/x)\n\n[x](javascript:alert%281%29) [y](data:text/html,evil) [z](jav&#x61;script:evil) [q](//evil.test)\n\n[okay](https://example.com/\"onclick=\"bad)\n\n`<img src=x onerror=alert(1)>`');
 expect(node.querySelector('script, iframe, form, input, img, svg, style')).toBeNull();
 for(const link of node.querySelectorAll('a')) expect(link.getAttribute('href')).toStartWith('https://');
 for(const element of node.querySelectorAll('*')) for(const attribute of element.attributes) expect(attribute.name.startsWith('on')).toBe(false);
 expect(node.textContent).toContain('<img src=x onerror=alert(1)>');
});
test('clipboard reports actual success or failure',async()=>{
 let copied=''; expect(await copyChatText('answer',{writeText:async text=>{copied=text}})).toBe(true); expect(copied).toBe('answer');
 expect(await copyChatText('answer',{writeText:async()=>{throw new Error('denied')}})).toBe(false); expect(await copyChatText('answer',undefined)).toBe(false);
});

test('decodes Markdown character references once in visible text, link labels, titles and image alt',()=>{
 const node=render('A &amp; B &#169; &#x1F600; &NotEqualTilde; &amp;amp; &copy\n\n[Terms &amp; notes](https://example.com/ "Title &copy; &amp; more")\n\n![Photo &amp; portrait &#169;](https://example.com/image.png)');
 expect(node.querySelector('p')?.textContent).toBe('A & B © 😀 ≂̸ &amp; &copy');
 expect(node.querySelector('a')?.textContent).toBe('Terms & notes');
 expect(node.querySelector('a')?.getAttribute('title')).toBe('Title © & more');
 expect(node.textContent).toContain('Photo & portrait ©');
 expect(node.querySelector('img')).toBeNull();
});

test('decodes link queries before setting href and rejects entity-obfuscated unsafe URLs',()=>{
 const node=render('[query](https://example.com/?a=1&amp;b=2)\n\n[bad](jav&#x61;script:alert%281%29) [data](d&#97;ta:text/html,evil) [remote](&#47;&#47;evil.test) [backslash](/&#92;evil.test) [control](/&#9;/evil.test)');
 const links=node.querySelectorAll('a');
 expect(links.length).toBe(1);
 expect(links[0]?.getAttribute('href')).toBe('https://example.com/?a=1&b=2');
 expect(new URL(links[0]!.getAttribute('href')!).searchParams.get('b')).toBe('2');
 expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer');
});

test('keeps code, escaped ampersands and raw HTML character references literal',()=>{
 const node=render('`&amp; &#169;`\n\n```html\n<b>&amp; &#169;</b>\n```\n\n<div title="&amp;">&#169;</div>\n\n\\&amp;');
 expect(node.querySelector('p code')?.textContent).toBe('&amp; &#169;');
 expect(node.querySelector('pre code')?.textContent).toBe('<b>&amp; &#169;</b>');
 expect(node.textContent).toContain('<div title="&amp;">&#169;</div>');
 expect(node.querySelector('div[title]')).toBeNull();
 expect(node.lastElementChild?.textContent).toBe('&amp;');
});
