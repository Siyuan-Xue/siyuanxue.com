import { expect, test } from 'bun:test';
import { resolveFlag } from '../src/features';

test('feature flags default when unset and accept only explicit booleans', () => {
 expect(resolveFlag(undefined, false)).toBe(false);
 expect(resolveFlag('', true)).toBe(true);
 expect(resolveFlag('true', false)).toBe(true);
 expect(resolveFlag('1', false)).toBe(true);
 expect(resolveFlag('false', true)).toBe(false);
 expect(resolveFlag('0', true)).toBe(false);
 expect(() => resolveFlag('yes', false)).toThrow('Invalid boolean feature flag');
});
