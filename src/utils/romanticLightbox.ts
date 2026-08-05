import type { Padding, PhotoSwipeOptions, Point } from 'photoswipe';

export const ROMANTIC_LIGHTBOX_ASPECT = 2 / 3;

export type RomanticLightboxLayout = Readonly<{
	padding: Padding;
	mediaWidth: number;
	mediaHeight: number;
	mediaTop: number;
}>;

export function getRomanticLightboxLayout(
	viewport: Pick<Point, 'x' | 'y'>,
): RomanticLightboxLayout {
	const compact = viewport.x <= 720;
	const side = compact ? 24 : 40;
	const top = compact ? 28 : 36;
	const bottom = compact ? 112 : 124;
	const availableWidth = Math.max(0, viewport.x - side * 2);
	const availableHeight = Math.max(0, viewport.y - top - bottom);
	const mediaWidth = Math.min(
		availableWidth,
		availableHeight * ROMANTIC_LIGHTBOX_ASPECT,
	);
	const mediaHeight = mediaWidth / ROMANTIC_LIGHTBOX_ASPECT;
	const mediaTop = top + (availableHeight - mediaHeight) / 2;

	return {
		padding: { top, bottom, left: side, right: side },
		mediaWidth,
		mediaHeight,
		mediaTop,
	};
}

export function createRomanticLightboxOptions(closeTitle: string): PhotoSwipeOptions {
	return {
		mainClass: 'romantic-lightbox',
		showHideAnimationType: 'zoom',
		bgOpacity: 0.78,
		loop: false,
		arrowKeys: false,
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
		tapAction: 'toggle-controls',
		doubleTapAction: 'zoom',
		preload: [0, 0],
		closeTitle,
		paddingFn: (viewport) => getRomanticLightboxLayout(viewport).padding,
	};
}
