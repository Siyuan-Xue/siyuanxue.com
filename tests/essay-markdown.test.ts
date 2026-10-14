import { expect, test } from 'bun:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { splitEssayFigures } from '../src/utils/essayFigures';

test('Markdown keeps figure markers while rendering code examples as text and preserving TOC anchors', async () => {
 const processor = await createMarkdownProcessor();
 const result = await processor.render('## 3. The blueprint\n\nBefore.\n\n<!-- figure:overview -->\n\nAfter.\n\n```html\n<!-- figure:example -->\n```');
 const blocks = splitEssayFigures(result.code, [{ id: 'overview' }]);
 expect(blocks.filter(block => block.type === 'figure')).toHaveLength(1);
 const html = blocks.filter(block => block.type === 'html').map(block => block.html).join('');
 expect(html).toContain(`id="${result.metadata.headings[0].slug}"`);
 expect(html).toContain('<p>Before.</p>');
 expect(html).toContain('<p>After.</p>');
 expect(html).toContain('figure:example');
});
