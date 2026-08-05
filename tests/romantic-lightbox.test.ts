import { describe, expect, test } from 'bun:test';
import {
	createRomanticLightboxOptions,
	getRomanticLightboxLayout,
} from '../src/utils/romanticLightbox';

describe('Romantic Mode lightbox layout', () => {
	test('reserves an editorial caption margin on desktop', () => {
		const layout = getRomanticLightboxLayout({ x: 1280, y: 900 });

		expect(layout.padding).toEqual({ top: 36, bottom: 124, left: 40, right: 40 });
		expect(layout.mediaWidth).toBeCloseTo(493.333, 3);
		expect(layout.mediaHeight).toBeCloseTo(740, 3);
		expect(layout.mediaTop).toBeCloseTo(36, 3);
	});

	test('keeps the frame and corner tab inside a 320px viewport', () => {
		const layout = getRomanticLightboxLayout({ x: 320, y: 640 });

		expect(layout.padding).toEqual({ top: 28, bottom: 112, left: 16, right: 16 });
		expect(layout.mediaWidth).toBe(288);
		expect(layout.mediaHeight).toBe(432);
		expect(layout.mediaTop).toBe(62);
	});
});

describe('Romantic Mode PhotoSwipe options', () => {
	test('delegates zoom, focus, keyboard, and reduced-motion behavior to PhotoSwipe', () => {
		const options = createRomanticLightboxOptions('Close Romantic Mode portrait');

		expect(options).toMatchObject({
			mainClass: 'romantic-lightbox',
			showHideAnimationType: 'zoom',
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
			bottom: 112,
			left: 16,
			right: 16,
		});
	});
});
