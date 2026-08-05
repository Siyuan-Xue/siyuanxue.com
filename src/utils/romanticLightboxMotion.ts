import { gsap } from 'gsap';
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

export function createRomanticLightboxMotion(
	elements: RomanticLightboxMotionElements,
	profile: RomanticLightboxMotionProfile,
): RomanticLightboxMotionController {
	const spec = getRomanticLightboxMotionSpec(profile);
	let timeline: gsap.core.Timeline | undefined;

	const killTimeline = () => {
		timeline?.kill();
		timeline = undefined;
	};

	const playOpen = () => {
		killTimeline();

		if ('final' in spec) {
			gsap.set(elements.frame, spec.final.frame);
			gsap.set(elements.image, spec.final.image);
			gsap.set(elements.reveal, spec.final.reveal);
			gsap.set([elements.footer, elements.proof, elements.close], spec.final.furniture);
			gsap.set(elements.sweep, spec.final.sweep);
			return;
		}

		timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
		gsap.set(elements.image, spec.open.image);
		timeline
			.fromTo(
				elements.frame,
				spec.open.frame.from,
				{ ...spec.open.frame.to, ease: 'power4.out' },
				0,
			)
			.fromTo(
				elements.reveal,
				spec.open.reveal.from,
				{ ...spec.open.reveal.to, ease: 'power2.inOut' },
				spec.open.reveal.at,
			)
			.fromTo(
				elements.sweep,
				spec.open.sweep.from,
				{ ...spec.open.sweep.to, ease: 'sine.inOut' },
				spec.open.sweep.at,
			)
			.to(elements.sweep, { opacity: 0, duration: 0.18 }, '>-=0.14')
			.fromTo(
				elements.footer,
				spec.open.footer.from,
				spec.open.footer.to,
				spec.open.footer.at,
			)
			.fromTo(
				elements.proof,
				spec.open.proof.from,
				spec.open.proof.to,
				spec.open.proof.at,
			)
			.fromTo(
				elements.close,
				spec.open.close.from,
				{ ...spec.open.close.to, ease: 'back.out(1.7)' },
				spec.open.close.at,
			);
	};

	const playClose = () => {
		killTimeline();

		if ('final' in spec) {
			gsap.set([
				elements.footer,
				elements.proof,
				elements.close,
				elements.frame,
				elements.reveal,
			], {
				opacity: 0,
			});
			return;
		}

		timeline = gsap.timeline({ defaults: { ease: 'power2.in' } });
		timeline
			.to(
				[elements.footer, elements.proof, elements.close],
				spec.close.furniture.to,
				spec.close.furniture.at,
			)
			.set([elements.sweep, elements.reveal], { opacity: 0 }, 0)
			.to(elements.frame, spec.close.frame.to, spec.close.frame.at);
	};

	const destroy = () => {
		killTimeline();
		const furniture = [elements.footer, elements.proof, elements.close];
		gsap.killTweensOf([
			elements.frame,
			elements.image,
			elements.reveal,
			elements.sweep,
			...furniture,
		]);
		gsap.set(elements.frame, { clearProps: 'clipPath,opacity,scale' });
		gsap.set(elements.image, { clearProps: 'clipPath,filter,opacity' });
		gsap.set(elements.reveal, { clearProps: 'clipPath,opacity' });
		gsap.set(elements.sweep, { clearProps: 'opacity,transform' });
		gsap.set(furniture, { clearProps: 'opacity,transform' });
	};

	return { playOpen, playClose, destroy };
}
