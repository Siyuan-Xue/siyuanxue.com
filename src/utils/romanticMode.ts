export const ROMANTIC_MODE_UNLOCK_TAPS = 7;
export const ROMANTIC_MODE_STORAGE_KEY = 'romantic-mode-unlocked-v1';

export type RomanticModeState = Readonly<{
	activationCount: number;
	unlocked: boolean;
	active: boolean;
}>;

export type RomanticModeStep = Readonly<{
	state: RomanticModeState;
	remaining: number;
	unlockedNow: boolean;
	toggledNow: boolean;
	shouldAnnounce: boolean;
}>;

export type RomanticModeStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function createRomanticModeState(
	unlocked = false,
	active = unlocked,
): RomanticModeState {
	return {
		activationCount: unlocked ? ROMANTIC_MODE_UNLOCK_TAPS : 0,
		unlocked,
		active: unlocked && active,
	};
}

export function advanceRomanticMode(state: RomanticModeState): RomanticModeStep {
	if (state.unlocked) {
		return {
			state: { ...state, active: !state.active },
			remaining: 0,
			unlockedNow: false,
			toggledNow: true,
			// On/off feedback only after the secret is already known.
			shouldAnnounce: true,
		};
	}

	const activationCount = Math.min(
		ROMANTIC_MODE_UNLOCK_TAPS,
		Math.max(0, Math.trunc(state.activationCount)) + 1,
	);
	const unlocked = activationCount === ROMANTIC_MODE_UNLOCK_TAPS;

	return {
		state: { activationCount, unlocked, active: unlocked },
		remaining: ROMANTIC_MODE_UNLOCK_TAPS - activationCount,
		unlockedNow: unlocked,
		toggledNow: false,
		// Toast every tap; copy must not name the mode or remaining taps until unlock.
		shouldAnnounce: true,
	};
}

export function restoreRomanticMode(
	storage: RomanticModeStorage | null,
	key = ROMANTIC_MODE_STORAGE_KEY,
): RomanticModeState {
	try {
		const stored = storage?.getItem(key);
		if (stored === '1') return createRomanticModeState(true);
		if (stored === '2') return createRomanticModeState(true, false);
		return createRomanticModeState();
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
		const stored = state.unlocked ? (state.active ? '1' : '2') : '0';
		storage.setItem(key, stored);
		return true;
	} catch {
		return false;
	}
}
