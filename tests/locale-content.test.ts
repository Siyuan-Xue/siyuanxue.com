import { describe, expect, test } from 'bun:test';
import { resolveLocale, localeOrigin, counterpartUrl } from '../src/i18n/locale';
import { pairEntries } from '../src/utils/contentPairs';
const entry = (id: string, date = '2026-01-01', draft = false) => ({ id, data: { date: new Date(date), draft, title: id, description: id } });
describe('authoritative build locale', () => {
 test('defaults only absent values and rejects invalid configuration', () => { expect(resolveLocale(undefined)).toBe('en'); expect(resolveLocale('zh')).toBe('zh'); expect(() => resolveLocale('fr')).toThrow(); expect(() => resolveLocale('')).toThrow(); });
 test('language link preserves pathname without search or fragment', () => { expect(localeOrigin('zh')).toBe('https://xuesiyuan.com'); expect(counterpartUrl('en', '/essay/a/?x=1#part')).toBe('https://xuesiyuan.com/essay/a/'); });
});
describe('paired publication', () => {
 test('returns selected entry in newest first order', () => { const pairs = pairEntries([entry('old/en'), entry('old/zh'), entry('new/en', '2026-02-01'), entry('new/zh', '2026-02-01')], 'zh'); expect(pairs.map(p => p.slug)).toEqual(['new','old']); expect(pairs[0].entry.id).toBe('new/zh'); });
 test('fails on incomplete published translations', () => { expect(() => pairEntries([entry('a/en')], 'en')).toThrow('translation'); });
 test('fails on duplicate entries and mismatched dates', () => { expect(() => pairEntries([entry('a/en'), entry('a/en'), entry('a/zh')], 'en')).toThrow('Duplicate'); expect(() => pairEntries([entry('a/en'), entry('a/zh', '2026-02-01')], 'en')).toThrow('date'); });
 test('either draft excludes both and incomplete draft is unpublished', () => { expect(pairEntries([entry('a/en'), entry('a/zh', '2026-02-01', true), entry('b/en', '2026-01-01', true)], 'en')).toEqual([]); });
 test('malformed source ids fail rather than silently disappear', () => { expect(() => pairEntries([entry('a/fr')], 'en')).toThrow('locale'); });
});
