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
 ] as const) expect(hint.parse(hash).theme ?? null).toBe(expected);
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
 expect(hint.href(base, { theme: 'dark' })).toBe(`${base}#theme=dark`);
 expect(hint.href(`${base}#a&theme=light&x=1`, { theme: 'dark' })).toBe(`${base}#a&x=1&theme=dark`);
 expect(hint.href(`${base}#theme=bad&theme=dark&a`, { theme: 'light' })).toBe(`${base}#a&theme=light`);
 for (const mode of [null, undefined, 'system', 'Dark', '']) {
  expect(hint.href(base, { theme: mode })).toBe(base);
  expect(hint.href(`${base}#a&theme=dark`, { theme: mode })).toBe(`${base}#a`);
  expect(hint.href(`${base}#theme=dark`, { theme: mode })).toBe(base);
 }
 expect(hint.href('https://xuesiyuan.com/', { theme: 'light' })).toBe('https://xuesiyuan.com/#theme=light');
});


test('each known key validates independently; duplicates never invalidate other keys', () => {
 expect(hint.parse('#theme=dark&header=open&media=shown')).toEqual({ theme: 'dark', header: 'open', media: 'shown' });
 expect(hint.parse('#header=open&header=open&media=shown&theme=Dark')).toEqual({ media: 'shown' });
 expect(hint.parse('#theme=light&media=shown&%6dedia=shown&x=1')).toEqual({ theme: 'light' });
 expect(hint.parse('#%68eader=%6fpen&%6dedia=%73hown')).toEqual({ header: 'open', media: 'shown' });
 for (const hash of ['#header', '#header=', '#header=Open', '#Header=open', '#header=closed', '#media=hidden', '#media=Shown', '#media=%2573hown', '#media=shown+', '#media=%ZZ']) expect(hint.parse(hash)).toEqual({});
});

test('receiver strips only successfully consumed keys, preserving invalid/duplicate/unknown bytes', () => {
 for (const [hash, rest] of [
  ['#a%20b&&theme=dark&header=open&media=shown&x=%20', '#a%20b&&x=%20'],
  ['#header=Open&media=shown&theme=dark&theme=light&a', '#header=Open&theme=dark&theme=light&a'],
  ['#header=open&header=open&media=invalid&x=1', '#header=open&header=open&media=invalid&x=1'],
  ['#header=open&media=shown', ''], ['#media=shown&', ''],
 ]) expect(hint.strip(hash, Object.keys(hint.parse(hash)))).toBe(rest);
});

test('href emits every combination of explicit non-default states in stable order', () => {
 const base = 'https://xuesiyuan.com/';
 for (const theme of [undefined, 'light', 'dark']) for (const header of [undefined, 'open']) for (const media of [undefined, 'shown']) {
  const pairs = [theme && `theme=${theme}`, header && `header=${header}`, media && `media=${media}`].filter(Boolean);
  expect(hint.href(base, { theme, header, media })).toBe(base + (pairs.length ? '#' + pairs.join('&') : ''));
 }
 expect(hint.href(base + '#a&header=bad&media=shown&theme=dark&x=%20', {})).toBe(base + '#a&x=%20');
 expect(hint.href(base, { theme: 'Dark', header: 'Open', media: 'hidden' })).toBe(base);
});
