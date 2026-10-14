import { expect, test } from 'bun:test';
import { splitEssayFigures } from '../src/utils/essayFigures';

test('essay figures interleave without changing heading anchors or surrounding HTML', () => {
 const figures = [{ id: 'overview', caption: 'Overview' }, { id: 'loop', caption: 'Loop' }];
 const before = '<h2 id="blueprint">3. The blueprint</h2>\n<p>Before.</p>\n';
 const between = '\n<p>Between.</p>\n';
 const after = '\n<p>After.</p>';
 const blocks = splitEssayFigures(`${before}<!-- figure:overview -->${between}<!-- figure:loop -->${after}`, figures);
 expect(blocks.filter(block => block.type === 'figure').map(block => block.figure)).toEqual(figures);
 expect(blocks.filter(block => block.type === 'html').map(block => block.html)).toEqual([before, between, after]);
});

test('plain essays and escaped code examples retain their HTML unchanged', () => {
 const html = '<!-- ordinary comment --><p>Text.</p><pre><code>&lt;!-- figure:example --&gt;</code></pre>';
 expect(splitEssayFigures(html, [])).toEqual([{ type: 'html', html }]);
});

test('unknown, missing or repeated figure references fail instead of silently losing content', () => {
 const figures = [{ id: 'overview' }];
 expect(() => splitEssayFigures('<!-- figure:typo -->', figures)).toThrow('Unknown essay figure marker: typo');
 expect(() => splitEssayFigures('<p>No figure.</p>', figures)).toThrow('Missing essay figure marker: overview');
 expect(() => splitEssayFigures('<!-- figure:overview --><!-- figure:overview -->', figures)).toThrow('Repeated essay figure marker: overview');
 expect(() => splitEssayFigures('<!-- figure:overview -->', [...figures, ...figures])).toThrow('Duplicate essay figure ID');
});
