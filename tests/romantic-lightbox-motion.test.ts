import { describe, expect, test } from 'bun:test';
import { getRomanticLightboxMotionProfile } from '../src/utils/romanticLightbox';
import { createRomanticLightboxMotion, getRomanticLightboxMotionSpec, toRomanticLightboxKeyframe } from '../src/utils/romanticLightboxMotion';

describe('Romantic Mode darkroom motion', () => {
	test('reveals the paper, photograph, sweep, and proof in a deliberate sequence', () => {
		const profile = getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, false);
		const spec = getRomanticLightboxMotionSpec(profile);

		expect(spec.reducedMotion).toBe(false);
		if (spec.reducedMotion) throw new Error('Expected animation');
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

		if (spec.reducedMotion) throw new Error('Expected animation');
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

describe('Romantic Mode Web Animations driver', () => {
	type Call = { keyframes: Keyframe[]; options: KeyframeAnimationOptions };
	const element = () => {
		const calls: Call[] = [];
		const style: Record<string, string> & { removeProperty(name: string): void } = {
			removeProperty(name: string) { delete style[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())]; },
		} as never;
		const node = {
			style,
			calls,
			animate(keyframes: Keyframe[], options: KeyframeAnimationOptions) {
				calls.push({ keyframes, options });
				return { commitStyles() {}, cancel() {} } as unknown as Animation;
			},
		};
		return node as unknown as HTMLElement & { calls: Call[]; style: Record<string, string> };
	};
	const elements = () => ({ frame: element(), image: [element()], reveal: element(), footer: element(), proof: element(), close: element(), sweep: element() });

	test('converts spec units to interpolable CSS keyframes', () => {
		expect(toRomanticLightboxKeyframe({ opacity: 0, scale: 0.96, clipPath: 'inset(49% 0 49% 0 round 2px)' })).toEqual({ clipPath: 'inset(49% 0 49% 0 round 2px)', opacity: '0', transform: 'translateY(0px) scale(0.96)' });
		expect(toRomanticLightboxKeyframe({ opacity: 0.72, yPercent: 115 })).toEqual({ opacity: '0.72', transform: 'translateY(115%) scale(1)' });
		expect(toRomanticLightboxKeyframe({ opacity: 1, y: 0 })).toEqual({ opacity: '1', transform: 'translateY(0px) scale(1)' });
	});

	test('schedules the open sequence at the spec times and keeps final frames', () => {
		const targets = elements();
		createRomanticLightboxMotion(targets, getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, false)).playOpen();
		const frame = targets.frame.calls[0]!;
		expect(frame.options).toMatchObject({ delay: 0, duration: 1100, fill: 'both' });
		expect(frame.keyframes.at(-1)).toEqual({ clipPath: 'inset(0% 0 0% 0 round 2px)', opacity: '1', transform: 'translateY(0px) scale(1)' });
		expect(targets.reveal.calls[0]!.options).toMatchObject({ delay: 40, duration: 1200 });
		expect(targets.sweep.calls.map(call => call.options.delay)).toEqual([180, 940]);
		expect(targets.footer.calls[0]!.options).toMatchObject({ delay: 820, duration: 420 });
		expect(targets.proof.calls[0]!.options.delay).toBe(900);
		expect(targets.close.calls[0]!.options).toMatchObject({ delay: 1000, duration: 320 });
		expect(targets.image[0]!.style.filter).toBe('none');
	});

	test('reduced motion sets end states without animating, and destroy clears them', () => {
		const targets = elements();
		const motion = createRomanticLightboxMotion(targets, getRomanticLightboxMotionProfile({ x: 1280, y: 900 }, true));
		motion.playOpen();
		expect([targets.frame, targets.reveal, targets.footer, targets.sweep].every(target => target.calls.length === 0)).toBe(true);
		expect(targets.frame.style.opacity).toBe('1');
		expect(targets.reveal.style.opacity).toBe('0');
		motion.playClose();
		expect(targets.footer.style.opacity).toBe('0');
		motion.destroy();
		expect(targets.frame.style.opacity).toBeUndefined();
		expect(targets.frame.style.clipPath).toBeUndefined();
	});
});
