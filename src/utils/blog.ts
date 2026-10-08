type Article = { slug: string; entry: { data: { date: Date } } };
export function mergeBlogEntries<E extends Article, P extends Article>(essays: E[], posts: P[]) {
 return [
  ...essays.map(item => ({ ...item, kind: 'essay' as const, href: `/essay/${item.slug}/` })),
  ...posts.map(item => ({ ...item, kind: 'post' as const, href: `/post/${item.slug}/` })),
 ].sort((a, b) => b.entry.data.date.valueOf() - a.entry.data.date.valueOf() || a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug));
}
