import type { MarkdownHeading } from 'astro';
export function tocHeadings(headings: MarkdownHeading[]): MarkdownHeading[] { return headings.filter(({ depth }) => depth === 2 || depth === 3); }
