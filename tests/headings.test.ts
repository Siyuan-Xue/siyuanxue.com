import { expect, test } from 'bun:test';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { tocHeadings } from '../src/utils/toc';
test('TOC uses renderer ids for fences, duplicates, underscores, entities and setext', async () => {
 const processor = await createMarkdownProcessor();
 const result = await processor.render('# Intro\n\n## Intro\n\n```md\n## Fake\n```\n\n## foo_bar\n\n### AT&amp;T\n\nSetext\n------\n\n#### Deeper');
 const headings = tocHeadings(result.metadata.headings);
 expect(headings.map(h => h.slug)).toEqual(['intro-1', 'foo_bar', 'att', 'setext']);
 for (const heading of headings) expect(result.code).toContain(`id="${heading.slug}"`);
 expect(headings.some(h => h.text === 'Fake')).toBe(false);
});
