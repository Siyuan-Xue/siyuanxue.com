import { expect, test } from 'bun:test';
import { advanceRomanticMode, createRomanticModeState } from '../src/utils/romanticMode';
test('the first activation reveals the photo, the next conceals it', () => {
 const initial = createRomanticModeState();
 expect(initial.active).toBe(false);
 const opened = advanceRomanticMode(initial).state;
 expect(opened.active).toBe(true);
 expect(advanceRomanticMode(opened).state.active).toBe(false);
 expect(createRomanticModeState().active).toBe(false);
});
