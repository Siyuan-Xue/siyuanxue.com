/**
 * Site feature switches, read at build time only.
 *
 * BLOG_ENABLED controls the blog: essay and post pages, the homepage "Blog"
 * section, the RSS feed and its <link>, blog entries in the sitemaps and IndexNow
 * manifest, and the chat's "Find a good read" prompt. Content in src/content/essays
 * and src/content/posts and all blog code stay in the repository either way, and
 * their translation pairing is still validated while the blog is off.
 *
 * To re-enable the blog, change the default below to `true`. The BLOG_ENABLED
 * environment variable (`true`/`false`) overrides it for a single build, which the
 * tests use to check both modes; production builds use the default.
 */
export const BLOG_ENABLED = resolveFlag(process.env.BLOG_ENABLED, false);

export function resolveFlag(value: string | undefined, fallback: boolean): boolean {
 if (value === undefined || value === '') return fallback;
 if (value === 'true' || value === '1') return true;
 if (value === 'false' || value === '0') return false;
 throw new Error(`Invalid boolean feature flag value: ${value}`);
}
