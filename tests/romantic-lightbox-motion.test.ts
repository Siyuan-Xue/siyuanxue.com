import { describe, expect, test } from 'bun:test';
import { getRomanticLightboxMotionProfile } from '../src/utils/romanticLightbox';
import { getRomanticLightboxMotionSpec } from '../src/utils/romanticLightboxMotion';

describe('Romantic Mode darkroom motion', () => {
	test('reveals the paper, photograph, sweep, and proof in a deliberate sequence', () => {
		const profile = getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, false);
		const spec = getRomanticLightboxMotionSpec(profile);

		expect(spec.reducedMotion).toBe(false);
		expect(spec.open.frame).toEqual({
			from: {
				clipPath: 'inset(49% 0 49% 0 round 2px)',
				opacity: 0,
				scale: 0.96,
			},
			to: {
				clipPath: 'inset(0% 0 0% 0 round 2px)',
				opacity: 1,
				scale: 1,
				duration: 1.1,
			},
		});
		expect(spec.open.image).toEqual({
			clipPath: 'inset(0% 0 0% 0)',
			filter: 'none',
			opacity: 1,
		});
		expect(spec.open.reveal).toEqual({
			from: {
				clipPath: 'inset(0% 0 0% 0)',
				opacity: 0.72,
			},
			to: {
				clipPath: 'inset(100% 0 0% 0)',
				opacity: 0,
				duration: 1.2,
			},
			at: 0.04,
		});
		expect(spec.open.sweep).toEqual({
			from: { opacity: 0, yPercent: -130 },
			to: { opacity: 0.72, yPercent: 115, duration: 0.9 },
			at: 0.18,
		});
		expect(spec.open.footer).toEqual({
			from: { opacity: 0, y: 14 },
			to: { opacity: 1, y: 0, duration: 0.42 },
			at: 0.82,
		});
		expect(spec.open.proof.at).toBe(0.9);
		expect(spec.open.close.at).toBe(1);
	});

	test('closes the editorial furniture before PhotoSwipe returns the portrait', () => {
		const profile = getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, false);
		const spec = getRomanticLightboxMotionSpec(profile);

		expect(spec.close.furniture).toEqual({
			to: { opacity: 0, y: 6, duration: 0.15 },
			at: 0,
		});
		expect(spec.close.frame).toEqual({
			to: {
				clipPath: 'inset(4% 2% 4% 2% round 2px)',
				opacity: 0,
				scale: 0.985,
				duration: 0.5,
			},
			at: 0.08,
		});
	});

	test('sets final states immediately when reduced motion is requested', () => {
		const profile = getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, true);
		const spec = getRomanticLightboxMotionSpec(profile);

		expect(spec).toEqual({
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
		});
	});
});
