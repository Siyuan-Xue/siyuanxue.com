type FigureBlock<T> = { type: 'html'; html: string } | { type: 'figure'; figure: T };

// Standalone <!-- figure:id --> markers place frontmatter figures inside rendered Markdown.
export function splitEssayFigures<T extends { id: string }>(html: string, figures: T[]): FigureBlock<T>[] {
 const byId = new Map(figures.map(figure => [figure.id, figure]));
 if (byId.size !== figures.length) throw new Error('Duplicate essay figure ID');
 const used = new Set<string>();
 const blocks: FigureBlock<T>[] = [];
 let offset = 0;
 for (const match of html.matchAll(/<!--\s*figure:([\s\S]*?)-->/g)) {
  const id = match[1].trim();
  const figure = byId.get(id);
  if (!figure) throw new Error(`Unknown essay figure marker: ${id}`);
  if (used.has(id)) throw new Error(`Repeated essay figure marker: ${id}`);
  blocks.push({ type: 'html', html: html.slice(offset, match.index) }, { type: 'figure', figure });
  used.add(id);
  offset = match.index + match[0].length;
 }
 for (const { id } of figures) if (!used.has(id)) throw new Error(`Missing essay figure marker: ${id}`);
 blocks.push({ type: 'html', html: html.slice(offset) });
 return blocks;
}
