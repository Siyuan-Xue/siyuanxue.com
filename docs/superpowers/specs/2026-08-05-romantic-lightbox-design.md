# Romantic Mode Editorial Lightbox Design

**Date:** 2026-08-05
**Status:** Approved for implementation planning

## Objective

Give the unlocked Romantic Mode portrait a polished, library-backed large-image experience. Clicking the second portrait should expand it from its thumbnail into a refined editorial frame, and closing should return it to the same thumbnail. The implementation must preserve the existing hidden-image, bilingual, responsive, and accessible behavior.

## Confirmed Direction

- Visual direction: **Editorial matte**.
- Close-control treatment: **Corner tab** crossing the upper-right paper edge.
- Decorative microcopy: `VII · PRIVATE PROOF`, unchanged between languages as an edition mark.
- Existing caption remains bilingual: `Some stories are still waiting in the draft.` / `有些故事还停在草稿里。`
- The portrait itself remains the focus. No glass glow, dark archive surface, ornamental hearts, or additional narrative copy will be added.

## Library Decision

Use `photoswipe` 5.4.4, the current release verified during design, and install it as a production dependency.

PhotoSwipe owns the behavior that should not be reimplemented locally:

- thumbnail-to-large-image zoom on open;
- reverse zoom on close;
- touch drag, pinch zoom, and double-click or double-tap zoom;
- Escape handling;
- focus trapping while open and focus restoration after close;
- background interaction and close lifecycle;
- automatic animation suppression for `prefers-reduced-motion`.

The site supplies only PhotoSwipe configuration, localization, and visual styling. It must not add a second FLIP implementation, a parallel modal state machine, or custom focus-trap code.

Alternatives considered:

- GLightbox offers a simpler zoom effect and built-in descriptions, but its transition is less closely tied to the originating thumbnail and its presentation is more opinionated.
- Motion is a strong general animation engine, but using it here would require rebuilding modal semantics, focus management, gesture handling, and shared-element geometry.

Primary references:

- [PhotoSwipe getting started](https://photoswipe.com/getting-started/)
- [Opening and closing transitions](https://photoswipe.com/opening-or-closing-transition/)
- [Separate DOM and data sources](https://photoswipe.com/data-sources/#separate-dom-and-data)
- [Custom UI elements](https://photoswipe.com/adding-ui-elements/)
- [Captions](https://photoswipe.com/caption/)

## Component Architecture

### `RomanticPortrait.astro`

Keep the seven-activation unlock flow, persisted on/off state, localized status messages, and thumbnail crossfade behavior intact.

Replace the hand-built native `<dialog>` lightbox markup and its open/close handlers with one PhotoSwipe lightbox instance scoped to the Romantic Portrait root. The secret portrait trigger remains hidden until Romantic Mode is unlocked and active.

The secret trigger should provide PhotoSwipe with:

- the full-size image URL;
- intrinsic width and height;
- the currently rendered secret thumbnail as the transition origin;
- localized alt text and close-label values;
- the caption text needed by the custom caption UI.

The PhotoSwipe core module should be loaded through its supported deferred module hook so the large-image engine is not part of the initial execution path. PhotoSwipe's stylesheet is bundled at build time; no CDN or runtime network dependency is introduced.

### PhotoSwipe configuration

Configure a one-item data source and bind it to the secret portrait. Disable gallery-only controls such as previous/next arrows and the item counter. Retain image zoom gestures.

Use PhotoSwipe's thumbnail element hook so the open transition begins at the actual second portrait and the close transition returns to it. Use the official UI registration lifecycle for the custom caption and close control.

No duplicate native dialog should remain after migration. PhotoSwipe is the sole large-image surface.

### Styling boundary

Keep site-specific styles in `src/styles/base.css`, namespaced under a Romantic Mode or PhotoSwipe modifier class so global PhotoSwipe behavior is not accidentally changed elsewhere.

The site may style documented PhotoSwipe elements and its own registered UI elements. It must not fork PhotoSwipe source or copy animation code from the package into the repository.

## Interaction Flow

1. The primary portrait retains the existing seven-activation unlock sequence.
2. On unlock, the secret portrait is revealed using the existing card transition and its thumbnail image is loaded.
3. Clicking the secret portrait opens PhotoSwipe with that thumbnail as the zoom origin.
4. The thumbnail expands into the viewport with PhotoSwipe's zoom transition and the editorial frame becomes visible as part of the lightbox presentation.
5. The user may close through the corner-tab button, Escape, or the supported background close action.
6. PhotoSwipe reverses the transition into the second portrait and restores focus to that trigger.
7. Toggling Romantic Mode off still conceals the second portrait as before.

If the user requests reduced motion, PhotoSwipe suppresses its open/close animation and the existing portrait swap continues without transitions.

## Visual Design

### Backdrop

- Use a neutral charcoal veil derived from the site's ink color rather than pure black.
- Add a restrained background blur only where browser support exists.
- Keep the backdrop visually quiet; there is no glow, vignette decoration, or animated texture.

### Editorial frame

- Surround the fitted portrait with a warm ivory matte based on the site's elevated and soft background tokens.
- Use one hairline border plus a faint offset outer rule to create the selected double-line treatment.
- Use a deep, diffuse shadow with low contrast so the frame reads as paper rather than a floating app card.
- Keep the full portrait visible with `object-fit: contain`; do not crop the subject in the large view.
- Place the bilingual caption in the lower paper margin, centered and set in the site's serif typography.
- Add `VII · PRIVATE PROOF` below the caption in small, widely tracked monospaced type. It is decorative edition metadata, not translated interface copy.

### Corner-tab close control

- Register a real button through PhotoSwipe's UI API.
- Position it across the upper-right paper edge, visually attached to the matte instead of floating over the photograph.
- Use the same warm paper surface, hairline border, and restrained shadow as the frame.
- Keep the `×` visually light, but preserve a minimum 44 × 44 CSS-pixel hit target.
- Localize its accessible label using the existing English and Chinese close labels.
- Preserve an obvious keyboard focus indicator without making it part of the resting decoration.

### Responsive behavior

- On desktop, cap the large image by both viewport width and height so the full portrait, caption, and close tab remain visible without page scroll.
- On narrow screens, reduce matte and caption spacing before reducing image size.
- Respect safe-area insets and keep the close tab inside the usable viewport.
- Do not introduce horizontal scrolling at 320 CSS pixels.
- When the user zooms the image, PhotoSwipe's image interaction takes priority; the static decorative frame must not block pan or pinch gestures.

## Localization and Accessibility

- Preserve the existing English and Chinese image alt text, caption, lightbox label, and close label.
- Update open PhotoSwipe UI when the site's language changes, matching the existing `site:language-change` behavior.
- The secret portrait remains a keyboard-operable trigger.
- PhotoSwipe traps focus while open, closes on Escape, and returns focus to the secret portrait.
- The corner-tab control remains a semantic button with an accessible name.
- The caption remains available to assistive technology outside purely decorative styling.
- Reduced-motion users receive an immediate open/close state change with no custom fallback animation.

## Loading and Privacy Contract

- The secret portrait remains absent from eager `<img>`, preload, prefetch, metadata, structured data, and sitemap output.
- The secret thumbnail is created only after Romantic Mode is unlocked, as it is today.
- Opening the lightbox may reuse the same browser-cached image; it must not create an additional alternate asset.
- PhotoSwipe and its CSS are bundled locally. No third-party request is made when a visitor opens the portrait.
- The existing robots exclusion for `/images/p-202.jpg` remains unchanged.

## Failure Handling

- A failed secret-image request must clear the loading indicator rather than leave an indefinite loading state.
- The site must not swallow unrelated page interactions if PhotoSwipe initialization cannot complete.
- Initialization is scoped per Romantic Portrait root and must not create duplicate listeners during normal Astro page execution.
- Destroy the lightbox instance during Astro page teardown only if the project later adopts client-side view transitions; no speculative teardown layer is required for the current multi-page site.

## Testing and Acceptance Criteria

Implementation follows a red-green-refactor cycle.

Automated checks must verify:

- `photoswipe` is a production dependency and the project uses its supported lightbox/core imports;
- the previous native Romantic Mode `<dialog>` and its manual open/close handlers are removed;
- the generated page still does not emit the secret portrait as an eager image or resource hint;
- the generated page includes the localized lightbox and close labels;
- the registered caption and corner-tab hooks exist in production output;
- gallery-only controls are disabled for the one-item lightbox;
- the existing Romantic Mode state-machine and privacy-output tests remain green;
- the production build and production-output suite pass with Bun 1.3.14.

Interactive verification must cover:

- open zoom begins at the second portrait and close zoom returns to it;
- the corner tab, Escape, and supported backdrop action close the lightbox;
- focus returns to the second portrait;
- English and Chinese captions and accessible labels update correctly;
- desktop, 720-pixel, and 320-pixel layouts keep the full frame and control visible;
- touch/pinch interaction is not blocked by decoration;
- reduced-motion mode opens and closes without animation;
- direct page load still leaves the secret asset unloaded until unlock.

## Scope Boundaries

This change does not alter:

- the seven-activation unlock count or messages;
- Romantic Mode persistence or its on/off toggle;
- the secret portrait asset or caption wording;
- global page layout, navigation, theme controls, or content routes;
- site metadata, robots policy, or sitemap behavior;
- the deployment or HTTPS configuration.
