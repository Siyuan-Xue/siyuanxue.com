import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const distDir = join(repoRoot, 'dist');
const indexPath = join(distDir, 'index.html');
const robotsPath = join(distDir, 'robots.txt');
const secretAssetPath = join(distDir, 'images', 'p-202.jpg');
const secretPublicPath = '/images/p-202.jpg';

function allFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		return statSync(path).isDirectory() ? allFiles(path) : [path];
	});
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } {
	if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
		throw new Error('p-202.jpg must contain JPEG data');
	}

	const startOfFrameMarkers = new Set([
		0xc0,
		0xc1,
		0xc2,
		0xc3,
		0xc5,
		0xc6,
		0xc7,
		0xc9,
		0xca,
		0xcb,
		0xcd,
		0xce,
		0xcf,
	]);
	let offset = 2;

	while (offset + 8 < bytes.length) {
		while (bytes[offset] === 0xff) offset += 1;
		const marker = bytes[offset];
		offset += 1;

		if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
		if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;

		const segmentLength = (bytes[offset] << 8) | bytes[offset + 1];
		if (segmentLength < 2 || offset + segmentLength > bytes.length) {
			throw new Error('p-202.jpg contains an invalid JPEG segment');
		}

		if (startOfFrameMarkers.has(marker)) {
			return {
				height: (bytes[offset + 3] << 8) | bytes[offset + 4],
				width: (bytes[offset + 5] << 8) | bytes[offset + 6],
			};
		}

		offset += segmentLength;
	}

	throw new Error('p-202.jpg has no readable JPEG dimensions');
}

describe('Romantic Mode production output', () => {
	test('pre-unlock toasts exist, avoid countdown copy, and only status7 names the mode', () => {
		expect(existsSync(indexPath)).toBe(true);
		const html = readFileSync(indexPath, 'utf8');

		for (let activation = 1; activation <= 7; activation += 1) {
			expect(html).toMatch(
				new RegExp(`data-status${activation}-en=["'][^"']+["']`),
			);
			expect(html).toMatch(
				new RegExp(`data-status${activation}-zh=["'][^"']+["']`),
			);
		}

		// No leftover “N taps remaining” style coaching.
		expect(html).not.toMatch(/\d+\s+taps?\s+away/i);
		expect(html).not.toMatch(/再点\s*\d+\s*次/);
		expect(html).not.toMatch(/还差\s*\d+\s*次/);

		// Status lines 1–6 must not name the secret mode.
		for (let activation = 1; activation <= 6; activation += 1) {
			const en = html.match(
				new RegExp(`data-status${activation}-en=["']([^"']+)["']`),
			)?.[1];
			const zh = html.match(
				new RegExp(`data-status${activation}-zh=["']([^"']+)["']`),
			)?.[1];
			expect(en).toBeTruthy();
			expect(zh).toBeTruthy();
			expect(en!.toLowerCase()).not.toContain('romantic mode');
			expect(zh!).not.toContain('心动模式');
		}

		expect(html).toMatch(/data-status7-en=["'][^"']*Romantic Mode[^"']*["']/);
		expect(html).toMatch(/data-status7-zh=["'][^"']*心动模式[^"']*["']/);

		for (const attribute of [
			'data-turn-on-label-en',
			'data-turn-on-label-zh',
			'data-turn-off-label-en',
			'data-turn-off-label-zh',
			'data-mode-on-en',
			'data-mode-on-zh',
			'data-mode-off-en',
			'data-mode-off-zh',
		]) {
			expect(html).toMatch(new RegExp(`${attribute}=["'][^"']+["']`));
		}
	});

	test('the secret portrait is not emitted as an eager resource', () => {
		expect(existsSync(indexPath)).toBe(true);
		const html = readFileSync(indexPath, 'utf8');
		const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
		const resourceTags = html.match(/<(?:source|video|link|object)\b[^>]*>/gi) ?? [];
		const htmlWithoutScripts = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

		expect(imageTags.some((tag) => tag.includes(secretPublicPath))).toBe(false);
		expect(resourceTags.some((tag) => tag.includes(secretPublicPath))).toBe(false);
		expect(
			new RegExp(
				`url\\(\\s*(['"]?)${secretPublicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1\\s*\\)`,
				'i',
			).test(htmlWithoutScripts),
		).toBe(false);
	});

	test('the secret portrait stays out of metadata and generated sitemaps', () => {
		const html = readFileSync(indexPath, 'utf8');
		const preloadLinks =
			html
				.match(/<link\b[^>]*>/gi)
				?.filter((tag) => /\brel\s*=\s*["'][^"']*(?:preload|prefetch)[^"']*["']/i.test(tag)) ??
			[];
		const socialImageMeta =
			html
				.match(/<meta\b[^>]*>/gi)
				?.filter((tag) => /\b(?:property|name)\s*=\s*["'](?:og|twitter):image(?::[^"']*)?["']/i.test(tag)) ??
			[];
		const structuredData =
			html
				.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi)
				?.filter((tag) => /\btype\s*=\s*["']application\/ld\+json["']/i.test(tag)) ?? [];

		expect(preloadLinks.some((tag) => tag.includes(secretPublicPath))).toBe(false);
		expect(socialImageMeta.some((tag) => tag.includes(secretPublicPath))).toBe(false);
		expect(structuredData.some((tag) => tag.includes(secretPublicPath))).toBe(false);

		const sitemapFiles = allFiles(distDir).filter((path) => extname(path) === '.xml');
		expect(sitemapFiles.length).toBeGreaterThan(0);
		for (const sitemapFile of sitemapFiles) {
			expect(readFileSync(sitemapFile, 'utf8')).not.toContain(secretPublicPath);
		}
	});

	test('robots.txt contains one exact exclusion for the secret portrait', () => {
		expect(existsSync(robotsPath)).toBe(true);
		const rules = readFileSync(robotsPath, 'utf8')
			.split(/\r?\n/)
			.map((line) => line.trim())
			.filter(Boolean);

		expect(rules.filter((line) => line === `Disallow: ${secretPublicPath}`)).toHaveLength(1);
		expect(rules).not.toContain(`Allow: ${secretPublicPath}`);
	});

	test('the placeholder honors the replacement asset contract', () => {
		expect(existsSync(secretAssetPath)).toBe(true);
		const bytes = readFileSync(secretAssetPath);
		expect(jpegDimensions(bytes)).toEqual({ width: 1200, height: 1800 });

		const metadataText = bytes.toString('latin1');
		expect(metadataText).not.toContain('Exif\u0000\u0000');
		expect(metadataText).not.toContain('http://ns.adobe.com/xap/1.0/');
		expect(metadataText).not.toContain('Photoshop 3.0');
	});
});
