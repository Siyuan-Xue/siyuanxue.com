import { expect, test } from 'bun:test';
import { createThemeHint } from '../src/utils/themeHint';

const hint = createThemeHint();
test('only an unambiguous, exactly light/dark theme hint is accepted after one percent decode', () => {
 for (const [hash, expected] of [
  ['#theme=dark', 'dark'], ['theme=light', 'light'], ['#a&theme=dark&x=1', 'dark'],
  ['#%74heme=%6cight', 'light'], ['#theme=%64ark', 'dark'],
  ['', null], ['#a', null], ['#theme', null], ['#theme=', null], ['#theme=system', null],
  ['#theme=Dark', null], ['#Theme=dark', null], ['#THEME=dark', null],
  ['#theme=dark&theme=dark', null], ['#theme=light&theme=dark', null],
  ['#theme=dark&%74heme=light', null], ['#theme=invalid&theme=dark', null],
  ['#theme=dark+light', null], ['#theme=%20dark', null], ['#theme=dark%20', null],
  ['#theme=%2564ark', null], ['#theme=%E0%A4', null], ['#%theme=dark', null],
  ['#theme=dark=light', null], ['#a%26theme%3Ddark', null],
 ] as const) expect(hint.parse(hash)).toBe(expected);
});

test('strip removes only decoded theme keys and preserves other fragment bytes', () => {
 for (const [hash, expected] of [
  ['#theme=dark', ''], ['#theme=dark&a', '#a'], ['#a&theme=light&x=%20', '#a&x=%20'],
  ['#a&&theme=dark&x=1', '#a&&x=1'], ['#a%20b&%74heme=dark', '#a%20b'],
  ['#a&theme=bad&theme=light', '#a'], ['#Theme=dark&a', '#Theme=dark&a'],
  ['#theme', ''], ['', ''], ['#a%26theme%3Ddark', '#a%26theme%3Ddark'],
 ]) expect(hint.strip(hash)).toBe(expected);
 expect(hint.anchor('#a%20b&x=1')).toBe('a b');
 expect(hint.anchor('#x=1&a')).toBe('a');
 expect(hint.anchor('#%broken')).toBeNull();
});

test('href preserves path/query and other fragments, replaces old hints, and never carries a system result', () => {
 const base = 'https://xuesiyuan.com/essay/a/?keep=%20&theme=query';
 expect(hint.href(base, 'dark')).toBe(`${base}#theme=dark`);
 expect(hint.href(`${base}#a&theme=light&x=1`, 'dark')).toBe(`${base}#a&x=1&theme=dark`);
 expect(hint.href(`${base}#theme=bad&theme=dark&a`, 'light')).toBe(`${base}#a&theme=light`);
 for (const mode of [null, undefined, 'system', 'Dark', '']) {
  expect(hint.href(base, mode)).toBe(base);
  expect(hint.href(`${base}#a&theme=dark`, mode)).toBe(`${base}#a`);
  expect(hint.href(`${base}#theme=dark`, mode)).toBe(base);
 }
 expect(hint.href('https://xuesiyuan.com/', 'light')).toBe('https://xuesiyuan.com/#theme=light');
});
