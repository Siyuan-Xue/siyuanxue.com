# Native browser theme adaptation — 2026-09-14

## Implementation

- Shared head script handles first paint, button toggles, and persisted `pageshow` restoration. The root theme class controls CSS `color-scheme`; the script updates the single `theme-color` and `color-scheme` meta elements and accessible button labels together.
- Theme persistence remains optional when local storage is blocked.
- Sticky header uses the existing background at **82% opacity** and **12px backdrop blur**. This incorporates the requested increase in transparency from the 88% demo. Opaque background remains the fallback when blur or color mixing is unsupported.
- Header layout, mobile viewport/safe areas, keyboard behavior and chat scroll structure are unchanged. No new dependencies, API, database, forced refresh/repaint, timers or overlay strips.

## Native Safari observations

Safari **26.6.2**, actual macOS window including address and tab bars:

1. Three minimal local pages used identical colors and toggle logic. An opaque sticky header left the native toolbar light after the page switched dark. A normal-flow header followed the page. An 88% translucent sticky header followed repeated light/dark changes without refresh.
2. The implemented 82% header passed both directions on the Chinese homepage, article and chat pages. The English homepage also followed the dark theme.
3. Article scrolling preserved readable navigation and matching native toolbar color.
4. Reloading light chat retained light mode. Switching chat dark then going back restored the article dark; switching the article light then going forward restored chat light. The native address and tab bars matched in both cases.
5. The existing local chat fixture generated 30 paragraphs without contacting a model. Scrolling from paragraphs 26–30 to 5–10 left the header and composer fixed.

These are observations on this Safari version, not a promise that websites can force browser chrome colors in every browser or user configuration.

## Verification

- `bun run check`: 68 files; zero errors, warnings or hints.
- `bun run test`: 85 passing tests.
- Bilingual build and output checks: 18 passing checks, 370 assertions.
- Regression test for persisted browser history: fails on the previous build for both locales, passes on this implementation.
- Python read-only tool suite: 18 tests, one skipped.
- Shell syntax plus HTTPS, Nginx bootstrap installation, health, release, domain migration and Hermes route contract tests passed.
- Nginx configuration execution check remains pending: this local environment has no `nginx` executable. CI installs it before running the release checks.
- `git diff --check` passed.

## Release gate: pending

Desktop Chrome cannot yet be accepted. Newly opened tabs crashed for the site preview, the minimal standalone fixture, and `https://example.com/`. The running process path reports Chrome **152.0.7977.83** while the installed app reports **153.0.8010.37**, suggesting a pending browser restart after update. Restart confirmation has been requested because current user windows would close briefly.

No production release has been made. Finish actual Chrome validation and release checks before publishing both domains. **Mobile is unverified**; no claim is made that the mobile issue is solved.

## References

- [WebKit discussion of fixed/sticky surfaces and native background extension](https://bugs.webkit.org/show_bug.cgi?id=301756#c2)
- [Chrome theme color guidance](https://developer.chrome.com/docs/lighthouse/pwa/themed-omnibox/)
- [WebKit viewport/safe-area guidance — mobile changes deferred](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
