import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Bi, Locale } from '../i18n/types';

export type EssayPair = {
	slug: string;
	date: Date;
	title: Bi;
	subtitle?: Bi;
	description: Bi;
	draft: boolean;
	en: CollectionEntry<'essay'>;
	zh: CollectionEntry<'essay'>;
};

export type PostPair = {
	slug: string;
	date: Date;
	title: Bi;
	description: Bi;
	draft: boolean;
	en: CollectionEntry<'post'>;
	zh: CollectionEntry<'post'>;
};

/** Content id is like "why-this-site/en" → slug "why-this-site", locale "en" */
export function parseLocaleId(id: string): { slug: string; locale: Locale } | null {
	const m = id.match(/^(.*)\/(en|zh)$/);
	if (!m) return null;
	return { slug: m[1], locale: m[2] as Locale };
}

function pairEssays(entries: CollectionEntry<'essay'>[]): EssayPair[] {
	const map = new Map<string, Partial<Record<Locale, CollectionEntry<'essay'>>>>();

	for (const entry of entries) {
		const parsed = parseLocaleId(entry.id);
		if (!parsed) continue;
		const bucket = map.get(parsed.slug) ?? {};
		bucket[parsed.locale] = entry;
		map.set(parsed.slug, bucket);
	}

	const pairs: EssayPair[] = [];
	for (const [slug, bucket] of map) {
		const en = bucket.en;
		const zh = bucket.zh;
		if (!en || !zh) {
			console.warn(`[content] essay "${slug}" needs both en.md and zh.md — skipped`);
			continue;
		}
		if (en.data.draft || zh.data.draft) continue;
		pairs.push({
			slug,
			date: en.data.date,
			title: { en: en.data.title, zh: zh.data.title },
			subtitle:
				en.data.subtitle || zh.data.subtitle
					? { en: en.data.subtitle ?? '', zh: zh.data.subtitle ?? '' }
					: undefined,
			description: { en: en.data.description, zh: zh.data.description },
			draft: false,
			en,
			zh,
		});
	}

	return pairs.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

function pairPosts(entries: CollectionEntry<'post'>[]): PostPair[] {
	const map = new Map<string, Partial<Record<Locale, CollectionEntry<'post'>>>>();

	for (const entry of entries) {
		const parsed = parseLocaleId(entry.id);
		if (!parsed) continue;
		const bucket = map.get(parsed.slug) ?? {};
		bucket[parsed.locale] = entry;
		map.set(parsed.slug, bucket);
	}

	const pairs: PostPair[] = [];
	for (const [slug, bucket] of map) {
		const en = bucket.en;
		const zh = bucket.zh;
		if (!en || !zh) {
			console.warn(`[content] post "${slug}" needs both en.md and zh.md — skipped`);
			continue;
		}
		if (en.data.draft || zh.data.draft) continue;
		pairs.push({
			slug,
			date: en.data.date,
			title: { en: en.data.title, zh: zh.data.title },
			description: { en: en.data.description, zh: zh.data.description },
			draft: false,
			en,
			zh,
		});
	}

	return pairs.sort((a, b) => b.date.valueOf() - a.date.valueOf());
}

export async function getEssayPairs(): Promise<EssayPair[]> {
	return pairEssays(await getCollection('essay'));
}

export async function getPostPairs(): Promise<PostPair[]> {
	return pairPosts(await getCollection('post'));
}

export async function getEssayPair(slug: string): Promise<EssayPair | undefined> {
	return (await getEssayPairs()).find((p) => p.slug === slug);
}

export async function getPostPair(slug: string): Promise<PostPair | undefined> {
	return (await getPostPairs()).find((p) => p.slug === slug);
}

export async function renderPairBodies(en: CollectionEntry<'essay'> | CollectionEntry<'post'>, zh: CollectionEntry<'essay'> | CollectionEntry<'post'>) {
	const [enR, zhR] = await Promise.all([render(en), render(zh)]);
	return { ContentEn: enR.Content, ContentZh: zhR.Content };
}

export function formatDate(date: Date, locale: Locale = 'en'): string {
	const tag = locale === 'zh' ? 'zh-CN' : 'en-US';
	return date.toLocaleDateString(tag, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}
