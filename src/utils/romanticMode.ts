export type RomanticModeState = Readonly<{ active: boolean }>;

/** A fresh page defaults to collapsed; only an incoming page-view hint can open it. */
export function createRomanticModeState(active = false): RomanticModeState {
 return { active };
}

export function advanceRomanticMode(state: RomanticModeState) {
 return { state: { active: !state.active } };
}
