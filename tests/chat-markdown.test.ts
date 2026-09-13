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
