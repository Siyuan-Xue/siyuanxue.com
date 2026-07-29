import { describe, expect, test } from 'bun:test';
import {
	advanceRomanticMode,
	createRomanticModeState,
	persistRomanticMode,
	restoreRomanticMode,
	ROMANTIC_MODE_STORAGE_KEY,
	ROMANTIC_MODE_UNLOCK_TAPS,
	type RomanticModeStorage,
} from '../src/utils/romanticMode';

function createMemoryStorage(): RomanticModeStorage & { values: Map<string, string> } {
	const values = new Map<string, string>();
	return {
		values,
		getItem(key) {
			return values.get(key) ?? null;
		},
		setItem(key, value) {
			values.set(key, value);
		},
	};
}

describe('Romantic Mode state machine', () => {
	test('starts locked and unlocks on exactly the seventh activation', () => {
		expect(ROMANTIC_MODE_UNLOCK_TAPS).toBe(7);
		let state = createRomanticModeState();

		expect(state).toEqual({ activationCount: 0, unlocked: false, active: false });

		for (let activation = 1; activation <= ROMANTIC_MODE_UNLOCK_TAPS; activation += 1) {
			const step = advanceRomanticMode(state);
			state = step.state;

			expect(state.activationCount).toBe(activation);
			expect(state.unlocked).toBe(activation === ROMANTIC_MODE_UNLOCK_TAPS);
			expect(state.active).toBe(activation === ROMANTIC_MODE_UNLOCK_TAPS);
			expect(step.remaining).toBe(ROMANTIC_MODE_UNLOCK_TAPS - activation);
			expect(step.unlockedNow).toBe(activation === ROMANTIC_MODE_UNLOCK_TAPS);
			expect(step.toggledNow).toBe(false);
		}
	});

	test('announces a countdown line after every activation', () => {
		let state = createRomanticModeState();
		const timeline: Array<{
			activation: number;
			remaining: number;
			shouldAnnounce: boolean;
			unlockedNow: boolean;
		}> = [];

		for (let activation = 1; activation <= ROMANTIC_MODE_UNLOCK_TAPS; activation += 1) {
			const step = advanceRomanticMode(state);
			state = step.state;
			timeline.push({
				activation,
				remaining: step.remaining,
				shouldAnnounce: step.shouldAnnounce,
				unlockedNow: step.unlockedNow,
			});
		}

		expect(timeline).toEqual([
			{ activation: 1, remaining: 6, shouldAnnounce: true, unlockedNow: false },
			{ activation: 2, remaining: 5, shouldAnnounce: true, unlockedNow: false },
			{ activation: 3, remaining: 4, shouldAnnounce: true, unlockedNow: false },
			{ activation: 4, remaining: 3, shouldAnnounce: true, unlockedNow: false },
			{ activation: 5, remaining: 2, shouldAnnounce: true, unlockedNow: false },
			{ activation: 6, remaining: 1, shouldAnnounce: true, unlockedNow: false },
			{ activation: 7, remaining: 0, shouldAnnounce: true, unlockedNow: true },
		]);
	});

	test('toggles the active mode after it has been unlocked', () => {
		const activeState = createRomanticModeState(true);
		const offStep = advanceRomanticMode(activeState);

		expect(activeState).toEqual({ activationCount: 7, unlocked: true, active: true });
		expect(offStep).toEqual({
			state: { activationCount: 7, unlocked: true, active: false },
			remaining: 0,
			unlockedNow: false,
			toggledNow: true,
			shouldAnnounce: true,
		});

		const onStep = advanceRomanticMode(offStep.state);
		expect(onStep.state).toEqual(activeState);
		expect(onStep.toggledNow).toBe(true);
		expect(onStep.shouldAnnounce).toBe(true);
	});
});

describe('Romantic Mode session persistence', () => {
	test('round-trips the unlocked state through the versioned session key', () => {
		const storage = createMemoryStorage();
		const unlockedState = createRomanticModeState(true);

		expect(persistRomanticMode(storage, unlockedState)).toBe(true);
		expect(storage.values.get(ROMANTIC_MODE_STORAGE_KEY)).toBe('1');
		expect(restoreRomanticMode(storage)).toEqual(unlockedState);
	});

	test('round-trips an unlocked but inactive mode through the session key', () => {
		const storage = createMemoryStorage();
		const inactiveState = createRomanticModeState(true, false);

		expect(persistRomanticMode(storage, inactiveState)).toBe(true);
		expect(storage.values.get(ROMANTIC_MODE_STORAGE_KEY)).toBe('2');
		expect(restoreRomanticMode(storage)).toEqual(inactiveState);
	});

	test('keeps a new session locked when no unlock marker exists', () => {
		const storage = createMemoryStorage();

		expect(restoreRomanticMode(storage)).toEqual(createRomanticModeState());
		expect(persistRomanticMode(storage, createRomanticModeState())).toBe(true);
		expect(storage.values.get(ROMANTIC_MODE_STORAGE_KEY)).toBe('0');
		expect(restoreRomanticMode(storage)).toEqual(createRomanticModeState());
	});

	test('supports a caller-provided storage key', () => {
		const storage = createMemoryStorage();
		const customKey = 'romantic-mode-test';

		expect(persistRomanticMode(storage, createRomanticModeState(true), customKey)).toBe(true);
		expect(storage.values.has(ROMANTIC_MODE_STORAGE_KEY)).toBe(false);
		expect(restoreRomanticMode(storage, customKey)).toEqual(createRomanticModeState(true));
	});

	test('falls back to locked state when session storage is unavailable', () => {
		const throwingStorage: RomanticModeStorage = {
			getItem() {
				throw new Error('storage disabled');
			},
			setItem() {
				throw new Error('storage disabled');
			},
		};

		expect(restoreRomanticMode(null)).toEqual(createRomanticModeState());
		expect(restoreRomanticMode(throwingStorage)).toEqual(createRomanticModeState());
		expect(persistRomanticMode(null, createRomanticModeState(true))).toBe(false);
		expect(persistRomanticMode(throwingStorage, createRomanticModeState(true))).toBe(false);
	});
});
