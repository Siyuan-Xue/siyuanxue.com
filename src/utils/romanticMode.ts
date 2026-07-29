export const ROMANTIC_MODE_UNLOCK_TAPS = 7;
export const ROMANTIC_MODE_STORAGE_KEY = 'romantic-mode-unlocked-v1';

export type RomanticModeState = Readonly<{
	activationCount: number;
	unlocked: boolean;
}>;

export type RomanticModeStep = Readonly<{
	state: RomanticModeState;
	remaining: number;
	unlockedNow: boolean;
	shouldAnnounce: boolean;
}>;

export type RomanticModeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function createRomanticModeState(unlocked = false): RomanticModeState {
	return {
		activationCount: unlocked ? ROMANTIC_MODE_UNLOCK_TAPS : 0,
		unlocked,
	};
}

export function advanceRomanticMode(state: RomanticModeState): RomanticModeStep {
	if (state.unlocked) {
		return {
			state,
			remaining: 0,
			unlockedNow: false,
			shouldAnnounce: false,
		};
	}

	const activationCount = Math.min(
		ROMANTIC_MODE_UNLOCK_TAPS,
		Math.max(0, Math.trunc(state.activationCount)) + 1,
	);
	const unlocked = activationCount === ROMANTIC_MODE_UNLOCK_TAPS;

	return {
		state: { activationCount, unlocked },
		remaining: ROMANTIC_MODE_UNLOCK_TAPS - activationCount,
		unlockedNow: unlocked,
		shouldAnnounce: activationCount >= 4,
	};
}

export function restoreRomanticMode(
	storage: RomanticModeStorage | null,
	key = ROMANTIC_MODE_STORAGE_KEY,
): RomanticModeState {
	try {
		return createRomanticModeState(storage?.getItem(key) === '1');
	} catch {
		return createRomanticModeState();
	}
}

export function persistRomanticMode(
	storage: RomanticModeStorage | null,
	state: RomanticModeState,
	key = ROMANTIC_MODE_STORAGE_KEY,
): boolean {
	try {
		if (!storage) return false;
		storage.setItem(key, state.unlocked ? '1' : '0');
		return true;
	} catch {
		return false;
	}
}
