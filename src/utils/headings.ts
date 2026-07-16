import GithubSlugger from 'github-slugger';

export type Heading = {
	depth: number;
	text: string;
	id: string;
};

/** Extract h2–h3 from raw markdown body (same slug algorithm as rehype-slug). */
export function extractHeadings(markdown: string): Heading[] {
	const slugger = new GithubSlugger();
	const headings: Heading[] = [];
	const lines = markdown.split(/\r?\n/);

	for (const line of lines) {
		const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
		if (!m) continue;
		const depth = m[1].length;
		// strip simple markdown links / emphasis for display + slug source
		const text = m[2]
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.replace(/[*_`~]/g, '')
			.trim();
		if (!text) continue;
		headings.push({ depth, text, id: slugger.slug(text) });
	}

	return headings;
}
