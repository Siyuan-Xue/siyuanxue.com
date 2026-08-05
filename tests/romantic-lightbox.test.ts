import { describe, expect, test } from 'bun:test';
import {
	createRomanticLightboxOptions,
	getRomanticLightboxLayout,
	getRomanticLightboxMotionProfile,
	shouldKeepRomanticLightboxPlaceholder,
} from '../src/utils/romanticLightbox';

describe('Romantic Mode lightbox layout', () => {
	test('caps the portrait at 560px and reserves its paper footer on desktop', () => {
		const layout = getRomanticLightboxLayout({ x: 1280, y: 900 });

		expect(layout).toMatchObject({
			padding: { top: 48, bottom: 120, left: 360, right: 360 },
			mediaWidth: 488,
			mediaHeight: 732,
			mediaTop: 48,
			frameWidth: 520,
			frameHeight: 820,
			frameTop: 32,
			matte: 16,
			footerHeight: 72,
		});
	});

	test('centers a full-width 560px proof in the tall screenshot viewport', () => {
		const layout = getRomanticLightboxLayout({ x: 922, y: 1348 });

		expect(layout).toMatchObject({
			padding: { top: 48, bottom: 120, left: 181, right: 181 },
			mediaWidth: 560,
			mediaHeight: 840,
			mediaTop: 218,
			frameWidth: 592,
			frameHeight: 928,
			frameTop: 202,
		});
	});

	test('switches to compact spacing at the 720px breakpoint', () => {
		const layout = getRomanticLightboxLayout({ x: 720, y: 800 });

		expect(layout).toMatchObject({
			padding: { top: 28, bottom: 94, left: 24, right: 24 },
			mediaWidth: 452,
			mediaHeight: 678,
			mediaTop: 28,
			frameWidth: 472,
			frameHeight: 752,
			frameTop: 18,
			matte: 10,
			footerHeight: 64,
		});
	});

	test('keeps the paper frame inside a 320px viewport', () => {
		const layout = getRomanticLightboxLayout({ x: 320, y: 640 });

		expect(layout).toMatchObject({
			padding: { top: 28, bottom: 94, left: 24, right: 24 },
			mediaWidth: 272,
			mediaHeight: 408,
			mediaTop: 83,
			frameWidth: 292,
			frameHeight: 482,
			frameTop: 73,
			matte: 10,
			footerHeight: 64,
		});
	});
});

describe('Romantic Mode motion profile', () => {
	test('uses the full darkroom reveal on wide screens', () => {
		expect(
			getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, false),
		).toEqual({
			showDurationMs: 1150,
			hideDurationMs: 720,
			frameDurationSeconds: 1.1,
			revealDurationSeconds: 1.2,
			footerDelaySeconds: 0.82,
			closeDelaySeconds: 1,
			reducedMotion: false,
		});
	});

	test('shortens the darkroom reveal on compact screens', () => {
		expect(
			getRomanticLightboxMotionProfile({ x: 720, y: 800 }, false),
		).toEqual({
			showDurationMs: 900,
			hideDurationMs: 560,
			frameDurationSeconds: 0.86,
			revealDurationSeconds: 0.95,
			footerDelaySeconds: 0.62,
			closeDelaySeconds: 0.8,
			reducedMotion: false,
		});
	});

	test('removes every staged delay when reduced motion is requested', () => {
		expect(
			getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, true),
		).toEqual({
			showDurationMs: 0,
			hideDurationMs: 0,
			frameDurationSeconds: 0,
			revealDurationSeconds: 0,
			footerDelaySeconds: 0,
			closeDelaySeconds: 0,
			reducedMotion: true,
		});
	});
});

describe('Romantic Mode PhotoSwipe options', () => {
	test('keeps the decoded thumbnail until the full image is mounted', () => {
		expect(
			shouldKeepRomanticLightboxPlaceholder(false, {
				isOpening: true,
				hasMountedImage: false,
			}),
		).toBe(true);
		expect(
			shouldKeepRomanticLightboxPlaceholder(false, {
				isOpening: false,
				hasMountedImage: false,
			}),
		).toBe(true);
		expect(
			shouldKeepRomanticLightboxPlaceholder(false, {
				isOpening: false,
				hasMountedImage: true,
			}),
		).toBe(false);
		expect(
			shouldKeepRomanticLightboxPlaceholder(true, {
				isOpening: false,
				hasMountedImage: true,
			}),
		).toBe(true);
	});

	test('delegates zoom, focus, keyboard, and reduced-motion behavior to PhotoSwipe', () => {
		const options = createRomanticLightboxOptions('Close Romantic Mode portrait');

		expect(options).toMatchObject({
			mainClass: 'romantic-lightbox',
			showHideAnimationType: 'zoom',
			showAnimationDuration: 1150,
			hideAnimationDuration: 720,
			bgOpacity: 0.86,
			loop: false,
			arrowPrev: false,
			arrowNext: false,
			counter: false,
			close: false,
			zoom: false,
			escKey: true,
			trapFocus: true,
			returnFocus: true,
			bgClickAction: 'close',
			imageClickAction: 'zoom-or-close',
			doubleTapAction: 'zoom',
			closeTitle: 'Close Romantic Mode portrait',
		});

		expect(options.paddingFn?.({ x: 320, y: 640 }, {}, 0)).toEqual({
			top: 28,
			bottom: 94,
			left: 24,
			right: 24,
		});
	});
});
