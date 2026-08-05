import type { Padding, PhotoSwipeOptions, Point } from 'photoswipe';

export const ROMANTIC_LIGHTBOX_ASPECT = 2 / 3;

export type RomanticLightboxLayout = Readonly<{
	padding: Padding;
	mediaWidth: number;
	mediaHeight: number;
	mediaTop: number;
	frameWidth: number;
	frameHeight: number;
	frameTop: number;
	matte: number;
	footerHeight: number;
}>;

export type RomanticLightboxMotionProfile = Readonly<{
	showDurationMs: number;
	hideDurationMs: number;
	frameDurationSeconds: number;
	revealDurationSeconds: number;
	footerDelaySeconds: number;
	closeDelaySeconds: number;
	reducedMotion: boolean;
}>;

export function shouldKeepRomanticLightboxPlaceholder(
	defaultKeep: boolean,
	state: Readonly<{ isOpening: boolean; hasMountedImage: boolean }>,
): boolean {
	return defaultKeep || state.isOpening || !state.hasMountedImage;
}

export function isRomanticLightboxBackdropTarget(
	classes: Readonly<{ contains: (name: string) => boolean }>,
): boolean {
	return classes.contains('pswp__item') || classes.contains('pswp__zoom-wrap');
}

export function getRomanticLightboxLayout(
	viewport: Pick<Point, 'x' | 'y'>,
): RomanticLightboxLayout {
	const compact = viewport.x <= 720;
	const side = compact ? 24 : Math.max(40, (viewport.x - 560) / 2);
	const top = compact ? 28 : 48;
	const bottom = compact ? 94 : 120;
	const matte = compact ? 10 : 16;
	const footerHeight = compact ? 64 : 72;
	const availableWidth = Math.max(0, viewport.x - side * 2);
	const availableHeight = Math.max(0, viewport.y - top - bottom);
	const mediaWidth = Math.min(
		availableWidth,
		availableHeight * ROMANTIC_LIGHTBOX_ASPECT,
	);
	const mediaHeight = mediaWidth / ROMANTIC_LIGHTBOX_ASPECT;
	const mediaTop = top + (availableHeight - mediaHeight) / 2;
	const frameWidth = mediaWidth + matte * 2;
	const frameHeight = matte + mediaHeight + footerHeight;
	const frameTop = mediaTop - matte;

	return {
		padding: { top, bottom, left: side, right: side },
		mediaWidth,
		mediaHeight,
		mediaTop,
		frameWidth,
		frameHeight,
		frameTop,
		matte,
		footerHeight,
	};
}

export function getRomanticLightboxMotionProfile(
	viewport: Pick<Point, 'x' | 'y'>,
	reducedMotion: boolean,
): RomanticLightboxMotionProfile {
	if (reducedMotion) {
		return {
			showDurationMs: 0,
			hideDurationMs: 0,
			frameDurationSeconds: 0,
			revealDurationSeconds: 0,
			footerDelaySeconds: 0,
			closeDelaySeconds: 0,
			reducedMotion: true,
		};
	}

	if (viewport.x <= 720) {
		return {
			showDurationMs: 900,
			hideDurationMs: 560,
			frameDurationSeconds: 0.86,
			revealDurationSeconds: 0.95,
			footerDelaySeconds: 0.62,
			closeDelaySeconds: 0.8,
			reducedMotion: false,
		};
	}

	return {
		showDurationMs: 1150,
		hideDurationMs: 720,
		frameDurationSeconds: 1.1,
		revealDurationSeconds: 1.2,
		footerDelaySeconds: 0.82,
		closeDelaySeconds: 1,
		reducedMotion: false,
	};
}

export function createRomanticLightboxOptions(closeTitle: string): PhotoSwipeOptions {
	return {
		mainClass: 'romantic-lightbox',
		showHideAnimationType: 'zoom',
		showAnimationDuration: 1150,
		hideAnimationDuration: 720,
		bgOpacity: 0.86,
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
		tapAction(_point, originalEvent) {
			const target = originalEvent.target;
			if (target instanceof Element && isRomanticLightboxBackdropTarget(target.classList)) {
				this.close();
			}
		},
		doubleTapAction: 'zoom',
		preloader: false,
		preload: [0, 0],
		closeTitle,
		paddingFn: (viewport) => getRomanticLightboxLayout(viewport).padding,
	};
}
