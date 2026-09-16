export type RomanticModeState = Readonly<{ active: boolean }>;

/** A fresh page is always collapsed; no unlock counter or stored permission. */
export function createRomanticModeState(active = false): RomanticModeState {
 return { active };
}

export function advanceRomanticMode(state: RomanticModeState) {
 return { state: { active: !state.active } };
}
