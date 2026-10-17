# Safari toolbar and page colour sync — 2026-10-16

Task: make Safari's native toolbar/top-bar colour and the page background change as one continuous colour change during a light/dark switch, on iOS and macOS Safari. Work started 2026-10-16 (file name follows the request) and was measured on 2026-10-17. Baseline `main` = `8f5e168`; production release `588fd1f`.

## Result

- **iOS (Safari 27, Simulator):** Safari tints the status-bar strip itself, by extending the sticky header's colour into the top inset. Before this change, the strip trailed the page by a frame and finished about 100ms late. On the chat page it never followed a live switch at all. After the change, the strip and the page start and finish together: a median end difference of 0ms on most pages.
- **macOS (Safari 27.0.1):** the toolbar and tab bar follow the page on every captured frame, both before and after (largest difference 1.8 of 255 luma). No macOS-specific timing is needed.
- **Timing used:** the page keeps its 100ms linear, zero-delay fade. That matches WebKit's native fade, a 0.1s `CABasicAnimation` with the default (linear) timing. No per-platform detection was added.

## Test environment

| Item | Version |
|---|---|
| Mac | macOS 27.0.1 (26A434) |
| Safari (macOS) | 27.0.1 (22625.1.29.11.28), separate tab layout, toolbar tinting on (observed; preferences not changed) |
| Xcode | 27.1 (27A9275) |
| iOS Simulator | iOS 27.0 (24A434) on iPhone 17; iOS 27.1 (24A94425) on iPhone Duo, the only device type the 27.1 runtime supports |
| iOS 26.5 runtime | Installed, but its iPhone 17 device failed to boot (CoreSimulator reported a damaged device), so it is untested |

**Method.** A local copy of each production build was served on `127.0.0.1`, with `/media/` proxied to production. A test-only script, never committed, clicked the real theme button every 1.2–1.5s, using the same code path as a manual click.

- **iOS:** `xcrun simctl io … recordVideo` captured the Simulator.
- **macOS:** `screencapture -v` captured real Safari, after the user granted Screen Recording permission.
- **Analysis:** an AVFoundation script read every recorded frame and averaged the luma of a 7×7 (iOS) or 9×9 (macOS) pixel box at fixed points: the status strip above the header, the header, the page body and the area below the iOS toolbar; on macOS, the toolbar, tab bar and page.
- **Timing:** for each switch, it recorded when each surface first left its old colour, when it reached the new one, and the largest difference between strip and page.

Frame timestamps come from the recordings (about 60Hz, variable rate), so single values are ±1 frame (~17ms).

## Sources and what they establish

1. **Apple, *Design for Safari 15* (WWDC21, session 10029)** — <https://developer.apple.com/videos/play/wwdc2021/10029/>. Introduced dynamic `theme-color`.
2. **WebKit, *New WebKit Features in Safari 15*** — <https://webkit.org/blog/11989/new-webkit-features-in-safari-15/>. `theme-color` (with `media` variants) tints the status bar and overscroll area on iOS 15, and the tab bar in the Compact Tab layout on macOS and iPadOS 15.
3. **WebKit, *WebKit Features in Safari 26.0* and *for Safari 27.0*** — <https://webkit.org/blog/17333/webkit-features-in-safari-26-0/>, <https://webkit.org/blog/18325/webkit-features-for-safari-27-0/>. Both were checked: neither documents toolbar tinting or its timing. Apple's Safari release notes could not be fetched from this environment.
4. **WebKit bug 301756, comment 2 (Wenson Hsieh)** — <https://bugs.webkit.org/show_bug.cgi?id=301756#c2>. A solid "top bar tint" colour extension is only used for viewport-constrained (fixed or sticky) elements at an obscured edge. It is more critical on iPhone.
5. **WebKit source, `main`, read on 2026-10-17:**
   - [`WKColorExtensionView.mm`](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/Cocoa/WKColorExtensionView.mm). Every colour update adds a `CABasicAnimation` on `backgroundColor` with `animationDuration = 0.1` and no timing function, so it is linear. It animates from the layer's *model* colour, the previous target, not from the colour currently on screen. On first reveal, the colour is set without animation.
   - [`LocalFrameView.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/LocalFrameView.cpp), `fixedContainerEdges()`:
     - Hit-tests each edge and keeps elements with `isFixedPositioned() || isStickilyPositioned()`.
     - Uses their **computed `background-color`** (`visitedDependentUsedBackgroundColorApplyingColorFilter`); `background-image` is not read.
     - A `backdrop-filter` in the lineage makes the edge "Multiple", with no solid colour.
     - Two different background colours in the lineage also make it "Multiple".
   - [`Page.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/Page.cpp):
     - `updateFixedContainerEdges()` decides when the top edge may be re-sampled (`canSampleTopEdge`).
     - `computeSampledPageTopColorIfNecessary()` computes `sampledPageTopColor` **once per document**; it is cleared only on navigation.
   - [`Document.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/dom/Document.cpp):
     - Replacing a `theme-color` meta and mutating it in place both reach `metaElementThemeColorChanged()` / `determineActiveThemeColorMetaElement()` and then `themeColorChanged()`.
     - System appearance changes re-evaluate `media` variants (`appearanceDidChange`).
   - [`WebPage.cpp`](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/WebProcess/WebPage/WebPage.cpp): on Mac, the pending theme-colour change is sent to the UI process at the next flush, not immediately.
   - [Commit 8b5cfad](https://github.com/WebKit/WebKit/commit/8b5cfad939f76e35a20fbc885759fb82914843d0) ([bug 317336](https://bugs.webkit.org/show_bug.cgi?id=317336)): from iOS 27, page colours are not shown in the leading obscured insets at the scroll origin; system-background extension views are used instead, matching macOS 27.
6. **Apple, `CAAnimation.timingFunction`** — <https://developer.apple.com/documentation/quartzcore/caanimation/timingfunction>. A nil timing function means linear pacing. This was already cited in the 2026-10-16 theme-transition audit.
7. **Secondary reports, used only for context:** Ben Frain on iOS 26 tinting with fixed elements (<https://benfrain.com/ios26-safari-theme-color-tab-tinting-with-fixed-position-elements/>) and Ben Nasedkin on Safari 26–27 colours (<https://nasedk.in/blog/ios26-safari-toolbar-colors/>). Both report that `theme-color` no longer drives the Safari 26+ toolbar.

`main`-branch WebKit can differ from shipping builds. The measurements below are authoritative for the tested builds; the source explains them.

## Measurements

Each row lists the time the native surface reached its final colour minus the time the page did (positive means the strip was late), and the largest mid-fade difference, as a share of the whole light/dark change.

### iOS 27.0, iPhone 17 Simulator

| Variant | Page | Switches | Strip end vs page end | Largest gap |
|---|---|---|---|---|
| A. Production before this change | EN home | 10 | +17 to +98ms, median ~92ms | ~17% |
| B. Sampled colour in one step, visible CSS fade (**shipped**) | EN home | 10 | −17 to +17ms, median ~4ms | 1–22%, median ~11% |
| C. B, with the visible fade started one frame later | EN home | 10 | 0 to +18ms | 8–24% |
| D. B, with the fade as a Web Animation | EN home / ZH essay | 10 / 6 | 0 to +20ms / +23 to +53ms | up to 18% / 61% |
| E. Theme switch inside a View Transition | EN home / ZH essay | 10 / 6 | **+268 to +305ms** | 100% |
| A. Production before this change | EN chat | 6 | Strip never changed (stayed at its load colour) | 100% |
| Final (B + chat `overflow: clip`) | EN home | 10 | −15 to +17ms, median 0ms | 2–21% |
| Final | ZH home | 6 | −17 to +28ms, median 0ms | 1–36% |
| Final | EN essay | 6 | −17 to +15ms, median 0ms | 6–22% |
| Final | ZH essay | 6 | 0 to +40ms, median ~30ms | 13–55% |
| Final | EN chat | 6 | −8 to 0ms | 10–14% |
| Final | ZH chat | 6 | +12 to +32ms, median ~18ms | 20–23% |
| Final, system appearance switch (no stored choice) | EN home | 4 | 0 to +17ms | 13–33% |
| Final, reduced motion on | EN home | 4 | Page instant; strip still fades ~90–110ms | ~80% |

The Chinese essay remains the worst page. In the Simulator, every frame of its fade repaints long CJK text, so the page shows only about three frames over its 100ms, while Safari's native fade stays smooth. Variants C, D and E did not fix this (above), so it is recorded as a residual rather than hidden by a page-specific timing value.

### iOS 27.1, iPhone Duo Simulator

The status area and Safari controls sit in a right-hand column, and there is no top strip. Sampled against the page, that column matched it on every frame, both before and after (6 switches each, gap 0 luma). The change is neutral on this form factor.

### macOS Safari 27.0.1

| Build | Pages | Largest toolbar or tab-bar vs page difference |
|---|---|---|
| Before | EN home, 6 switches | 1.1 luma |
| B | EN home, 6 switches | 1.8 luma |
| Final | EN home, ZH home, EN chat, ZH essay, 6 switches each | 0.6–1.8 luma |

The toolbar runs through the full light and dark range, so it is tinted, and it changes on the same frames as the page.

### First paint and cross-domain hint

Opening `/essay/embodied-agent/#theme=dark&header=open` on the Chinese build with the system in light mode reproduces the language switch exactly.

- **iOS:** Safari showed its own white navigation frame, then the first page frame had the strip, header and body all dark at once, with no fade.
- **macOS:** Safari's white navigation frame was followed by the toolbar and page dark on the same frame.

The hint was consumed and the header stayed expanded. There was no flash of the wrong theme.

## Why the fix works

- **WebKit restarts its fade on every sample.** It samples the sticky header's *computed* `background-color` on each rendering update and starts a new 0.1s linear fade from the previous sample.
  - During the page's own 100ms CSS fade, that colour changed every frame, so the native strip kept restarting one frame behind and ended with a full 100ms fade over the last step.
  - With an instant page switch (the pre-2026-10-16 behaviour), the strip instead lags by a whole 100ms fade.
- **Shipped change (`src/styles/theme-colors.css`, `src/styles/base.css`):**
  - `.header` keeps `background-color: var(--bg-target)`, a new unregistered token that switches in one step.
  - The header paints its visible fade with an opaque `background-image: linear-gradient(var(--bg), var(--bg))`.
  - WebKit therefore sees exactly one new colour, at the commit of the first fade frame, and starts its 0.1s linear fade then. The page runs its own 100ms linear fade from that same style change.
  - Nothing else changes visually: the gradient covers the background colour, and print, no-JS and reduced-motion palettes define `--bg-target` alongside `--bg`.
- **Chat (`src/components/chat/chat.css`):**
  - `body { overflow: hidden }` made `<body>` the sticky header's scroller, and the live strip never re-sampled.
  - The strip then kept the colour from load, consistent with the once-per-document `sampledPageTopColor`.
  - `overflow: clip` clips the same way without creating a scroll container. A fixed header and `overflow: visible` were also measured and also worked; `clip` was chosen as the smallest layout change.
- **One place, one frame (`src/scripts/theme.js`):** `applyTheme()` was already the single synchronous entry for every path: toggle, system change, storage, hash, first paint and BFCache. It switches the class, `--bg-target`, `color-scheme` and the `theme-color` pair in one call, with no timers or `requestAnimationFrame`. Only a comment was added.

## Questions from the request

- **iOS vs macOS:**
  - **iOS 27:** `theme-color` does not tint the status strip. The strip comes from the sticky header's colour extension (native, 0.1s linear); without one, it shows the once-sampled page colour.
  - **macOS 27.0.1, separate tab layout with tinting:** the toolbar and tab bar repaint with the page on the same frame, with no separate fade. The header keeps its `blur(0px)` filter on Mac (2026-10-15 audit), so WebKit's edge is "Multiple" there.
  - **Not tested:** the compact tab layout. The user's Safari uses the separate layout, and preferences were not changed.
- **Duration and easing:** iOS 0.1s linear (source, and measured at 82–113ms per strip fade). macOS has no separate animation (measured).
- **Meta tag replaced vs mutated:** WebKit handles both through the same change notification (source). The site's existing replace-or-insert logic is unchanged, and `theme-color` is still emitted for older Safari and other browsers. The two strategies were not separately measured, because iOS 27 tints from the colour extension, not `theme-color`.
- **Inside a transition or View Transition:**
  - CSS transitions on the sampled colour cause the restart lag described above.
  - A same-document View Transition is worse: WebKit stopped tracking the header until the crossfade ended, so the strip started 270–305ms late (variant E). Theme switches must not use View Transitions.

## Paths covered

| Path | Behaviour | Evidence |
|---|---|---|
| Manual toggle | Fades together | iOS 27.0, six pages, both locales; macOS, four pages |
| System preference change | Fades together | iOS 27.0, measured; macOS not changed, since it would alter the user's system setting |
| `storage` event from another tab | Same `applyTheme(…, true)` call as the toggle | Unit tests |
| Language switch / URL hash | Correct first frame, no fade | iOS 27.0 and macOS, measured |
| Initial load, BFCache | Instant, unchanged | Existing unit tests |
| Reduced motion | Page instant. iOS Safari still runs its own ~0.1s strip fade, which pages cannot disable: `WKColorExtensionView` has no reduced-motion check | iOS 27.0, measured |

## Verification

- `bun run check`: 0 errors, 0 warnings, 0 hints.
- `bun run test`: 263 pass, 0 fail, using Python 3.12 for the Python-backed tests. This includes the new header-sampling test in `tests/theme.test.ts` and the chat `overflow: clip` test in `tests/chat-elements.test.ts`.
- `bun run build` (both locales): 0 warnings, 51/51 output checks. `bun run test:gallery`: pass.
- Frame strips (iOS before/after for home and chat; macOS) and the raw recordings were delivered with the report. They are not committed, because the repository keeps raster and video files out of Git.

## Not verified, needs a real device

- **A real iPhone:** 120Hz ProMotion, real GPU timing, Safari chrome differences from the Simulator, and the "Allow Website Tinting" setting. The Chinese essay residual (+~30ms in the Simulator) may differ on hardware.
- **Other OS versions and layouts:** iOS 26.x (the Simulator device failed to boot), iPadOS, and the macOS compact tab layout.
- **Rapid double switches** within 100ms: by source, WebKit restarts from the previous target colour; not measured.

## Recovery

Revert the two product commits. That restores the header's plain `background-color: var(--bg)`, removes `--bg-target`, and returns the chat body to `overflow: hidden`, which reintroduces the stale chat strip. No storage, hash-hint format or server change is involved.
