import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

// WCAG 2.x relative luminance and contrast for the palette's text pairs.
const read = (name: string) => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8');
const palette = (css: string, selector: string) => {
 const block = css.slice(css.indexOf(`${selector} {`));
 const body = block.slice(0, block.indexOf('}'));
 return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value!.toLowerCase()]));
};
const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const luminance = (rgb: number[]) => {
 const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
 return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: number[], b: number[]) => {
 const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
 return (hi! + 0.05) / (lo! + 0.05);
};
const mix = (fg: number[], bg: number[], alpha: number) => fg.map((c, i) => c * alpha + bg[i]! * (1 - alpha));

const css = read('theme-colors.css');
const themes = { light: palette(css, ':root'), dark: palette(css, 'html.u-mode-invert') };

for (const [name, colors] of Object.entries(themes)) {
 test(`${name} text tokens meet WCAG AA on page and raised surfaces`, () => {
  for (const surface of ['--bg', '--bg-elevated']) {
   for (const text of ['--fg', '--fg-body', '--fg-muted']) {
    expect(contrast(channels(colors[text]!), channels(colors[surface]!))).toBeGreaterThanOrEqual(4.5);
   }
  }
  expect(contrast(channels(colors['--fg-interactive']!), channels(colors['--bg']!))).toBeGreaterThanOrEqual(4.5);
 });

 test(`${name} inactive article TOC entries meet WCAG AA`, () => {
  const opacity = Number(/\.prose-page \.toc-link \{[^}]*opacity:\s*([\d.]+)/.exec(read('article.css'))![1]);
  const fg = channels(colors['--fg']!), bg = channels(colors['--bg']!);
  expect(contrast(mix(fg, bg, opacity), bg)).toBeGreaterThanOrEqual(4.5);
 });
}
