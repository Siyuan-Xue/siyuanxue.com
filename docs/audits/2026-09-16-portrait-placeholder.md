# Portrait reveal and abstract placeholder

The proposed GSAP Flip/native-dialog redesign was rejected and fully discarded. The original CSS, PhotoSwipe integration, lightbox choreography, package manifest, and lockfile are unchanged. Only the first-click reveal, removal of unlock storage/counters, associated labels/tests, and placeholder replacement remain.

A fresh page starts collapsed. One activation reveals the secondary image; subsequent activations toggle it. Old `romantic-mode-unlocked-v1` values are ignored. The original enlarged viewer remains available from the exposed secondary photograph.

## Image

`public/images/romantic-placeholder.webp`, 1024 × 1536, generated with the built-in imagegen tool and encoded as WebP (quality 85). The more realistic first illustration was discarded. This is an anonymous abstract illustration, not a photograph of an actual partner.

Final image-edit prompt:

> Transform this into a MUCH more abstract and hazy female portrait PLACEHOLDER. The user says it is much too realistic. Completely eliminate all facial details: NO eyes, NO eyebrows, NO nose detail, NO lips, NO realistic skin, NO hair strands, NO clothing seams. Reduce the entire woman to just THREE OR FOUR very soft indistinct shapes: an anonymous blank oval suggestion of a face, one flowing muted taupe hair mass, a narrow neck, a barely suggested shoulder in pale dusty rose. Blur and dissolve all edges into an almost plain warm off-white paper background. Very low contrast, airy negative space, far less texture than the original. Feminine grace suggested by the silhouette only; no identifiable person. Think an abstract memory or softly faded silhouette, not a portrait drawing. Minimal elegant vintage editorial placeholder. Keep vertical 2:3 composition, head and shoulders centered with generous margins. No text, no frame, no scenery, no symbols.

## Verification

- Astro and TypeScript checks: no errors or warnings.
- Unit/integration suite: 79 passed.
- Bilingual production build and output verification: 18 passed.
- Independent review found no substantive issues in the final reduced scope.
- Chromium and WebKit: English/Chinese × desktop/mobile (8 scenarios), first-click reveal, exposed-photo pointer activation, original lightbox, Escape close, collapse, refresh and ignored legacy storage all passed without page errors.
