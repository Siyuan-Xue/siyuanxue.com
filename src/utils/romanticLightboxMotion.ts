import type { RomanticLightboxMotionProfile } from './romanticLightbox';

export type RomanticLightboxMotionElements = Readonly<{
	frame: HTMLElement;
	image: HTMLElement | HTMLElement[];
	reveal: HTMLElement;
	footer: HTMLElement;
	proof: HTMLElement;
	close: HTMLElement;
	sweep: HTMLElement;
}>;

export type RomanticLightboxMotionController = Readonly<{
	playOpen: () => void;
	playClose: () => void;
	destroy: () => void;
}>;

export function getRomanticLightboxMotionSpec(
	profile: RomanticLightboxMotionProfile,
) {
	if (profile.reducedMotion) {
		return {
			reducedMotion: true,
			final: {
				frame: {
					clipPath: 'inset(0% 0 0% 0 round 2px)',
					opacity: 1,
					scale: 1,
				},
				image: {
					clipPath: 'inset(0% 0 0% 0)',
					filter: 'none',
					opacity: 1,
				},
				reveal: {
					clipPath: 'inset(100% 0 0% 0)',
					opacity: 0,
				},
				furniture: { opacity: 1, y: 0 },
				sweep: { opacity: 0, yPercent: 115 },
			},
		} as const;
	}

	return {
		reducedMotion: false,
		open: {
			frame: {
				from: {
					clipPath: 'inset(49% 0 49% 0 round 2px)',
					opacity: 0,
					scale: 0.96,
				},
				to: {
					clipPath: 'inset(0% 0 0% 0 round 2px)',
					opacity: 1,
					scale: 1,
					duration: profile.frameDurationSeconds,
				},
			},
			image: {
				clipPath: 'inset(0% 0 0% 0)',
				filter: 'none',
				opacity: 1,
			},
			reveal: {
				from: {
					clipPath: 'inset(0% 0 0% 0)',
					opacity: 0.72,
				},
				to: {
					clipPath: 'inset(100% 0 0% 0)',
					opacity: 0,
					duration: profile.revealDurationSeconds,
				},
				at: 0.04,
			},
			sweep: {
				from: { opacity: 0, yPercent: -130 },
				to: {
					opacity: 0.72,
					yPercent: 115,
					duration: Number(
						(profile.revealDurationSeconds * 0.75).toFixed(3),
					),
				},
				at: 0.18,
			},
			footer: {
				from: { opacity: 0, y: 14 },
				to: { opacity: 1, y: 0, duration: 0.42 },
				at: profile.footerDelaySeconds,
			},
			proof: {
				from: { opacity: 0, y: 8 },
				to: { opacity: 1, y: 0, duration: 0.34 },
				at: Number((profile.footerDelaySeconds + 0.08).toFixed(3)),
			},
			close: {
				from: { opacity: 0, scale: 0.84 },
				to: { opacity: 1, scale: 1, duration: 0.32 },
				at: profile.closeDelaySeconds,
			},
		},
		close: {
			furniture: {
				to: { opacity: 0, y: 6, duration: 0.15 },
				at: 0,
			},
			frame: {
				to: {
					clipPath: 'inset(4% 2% 4% 2% round 2px)',
					opacity: 0,
					scale: 0.985,
					duration: 0.5,
				},
				at: 0.08,
			},
		},
	} as const;
}

/** GSAP-style tween values from the spec: seconds, px offsets and unitless scale. */
export type RomanticLightboxTween = Readonly<{
	clipPath?: string;
	filter?: string;
	opacity?: number;
	scale?: number;
	y?: number;
	yPercent?: number;
	duration?: number;
}>;

// The spec's named curves as CSS cubic-béziers (Penner equivalents).
export const ROMANTIC_LIGHTBOX_EASING = {
	out: 'cubic-bezier(0.33, 1, 0.68, 1)', // power2.out
	frameOut: 'cubic-bezier(0.22, 1, 0.36, 1)', // power4.out
	revealInOut: 'cubic-bezier(0.65, 0, 0.35, 1)', // power2.inOut
	sweepInOut: 'cubic-bezier(0.37, 0, 0.63, 1)', // sine.inOut
	closeIn: 'cubic-bezier(0.32, 0, 0.67, 0)', // power2.in
	backOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // back.out(1.7)
} as const;

/** One CSS keyframe; a transform always lists translate then scale so tweens interpolate. */
export function toRomanticLightboxKeyframe({ clipPath, filter, opacity, scale, y, yPercent }: RomanticLightboxTween): Keyframe {
	const keyframe: Keyframe = {};
	if (clipPath !== undefined) keyframe.clipPath = clipPath;
	if (filter !== undefined) keyframe.filter = filter;
	if (opacity !== undefined) keyframe.opacity = String(opacity);
	if (scale !== undefined || y !== undefined || yPercent !== undefined) {
		keyframe.transform = `translateY(${yPercent === undefined ? `${y ?? 0}px` : `${yPercent}%`}) scale(${scale ?? 1})`;
	}
	return keyframe;
}

const animatedProperties = ['clip-path', 'filter', 'opacity', 'transform'] as const;

/** Web Animations driver for the tested spec; no animation runtime is loaded. */
export function createRomanticLightboxMotion(
	elements: RomanticLightboxMotionElements,
	profile: RomanticLightboxMotionProfile,
): RomanticLightboxMotionController {
	const spec = getRomanticLightboxMotionSpec(profile);
	const images = Array.isArray(elements.image) ? elements.image : [elements.image];
	const furniture = [elements.footer, elements.proof, elements.close];
	const all = [elements.frame, ...images, elements.reveal, elements.sweep, ...furniture];
	let running: Animation[] = [];

	// Interruption keeps the current frame: commit it inline, then cancel.
	const stop = () => {
		for (const animation of running) {
			try { animation.commitStyles(); } catch { /* Not rendered: nothing to keep. */ }
			animation.cancel();
		}
		running = [];
	};
	const set = (targets: readonly HTMLElement[], values: RomanticLightboxTween) => {
		for (const target of targets) Object.assign(target.style, toRomanticLightboxKeyframe(values));
	};
	const tween = (
		target: HTMLElement,
		from: RomanticLightboxTween | null,
		to: RomanticLightboxTween,
		at: number,
		easing: string,
	) => {
		const keyframes = from ? [toRomanticLightboxKeyframe(from), toRomanticLightboxKeyframe(to)] : [toRomanticLightboxKeyframe(to)];
		running.push(target.animate(keyframes, { duration: Math.round((to.duration ?? 0) * 1000), delay: Math.round(at * 1000), easing, fill: 'both' }));
	};

	const playOpen = () => {
		stop();
		if (spec.reducedMotion) {
			set([elements.frame], spec.final.frame);
			set(images, spec.final.image);
			set([elements.reveal], spec.final.reveal);
			set(furniture, spec.final.furniture);
			set([elements.sweep], spec.final.sweep);
			return;
		}
		const { open } = spec;
		set(images, open.image);
		tween(elements.frame, open.frame.from, open.frame.to, 0, ROMANTIC_LIGHTBOX_EASING.frameOut);
		tween(elements.reveal, open.reveal.from, open.reveal.to, open.reveal.at, ROMANTIC_LIGHTBOX_EASING.revealInOut);
		tween(elements.sweep, open.sweep.from, open.sweep.to, open.sweep.at, ROMANTIC_LIGHTBOX_EASING.sweepInOut);
		// The light band fades out over the last 0.14s of its travel.
		tween(elements.sweep, null, { opacity: 0, duration: 0.18 }, open.sweep.at + open.sweep.to.duration - 0.14, ROMANTIC_LIGHTBOX_EASING.out);
		tween(elements.footer, open.footer.from, open.footer.to, open.footer.at, ROMANTIC_LIGHTBOX_EASING.out);
		tween(elements.proof, open.proof.from, open.proof.to, open.proof.at, ROMANTIC_LIGHTBOX_EASING.out);
		tween(elements.close, open.close.from, open.close.to, open.close.at, ROMANTIC_LIGHTBOX_EASING.backOut);
	};

	const playClose = () => {
		stop();
		if (spec.reducedMotion) {
			set([...furniture, elements.frame, elements.reveal], { opacity: 0 });
			return;
		}
		const { close } = spec;
		set([elements.sweep, elements.reveal], { opacity: 0 });
		for (const target of furniture) tween(target, null, close.furniture.to, close.furniture.at, ROMANTIC_LIGHTBOX_EASING.closeIn);
		tween(elements.frame, null, close.frame.to, close.frame.at, ROMANTIC_LIGHTBOX_EASING.closeIn);
	};

	const destroy = () => {
		for (const animation of running) animation.cancel();
		running = [];
		for (const target of all) for (const property of animatedProperties) target.style.removeProperty(property);
	};

	return { playOpen, playClose, destroy };
}
