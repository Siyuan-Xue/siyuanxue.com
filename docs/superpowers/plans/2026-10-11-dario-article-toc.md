# Dario Article TOC Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this bounded adaptation inline; use one independent final review.

**Goal:** Reproduce the observed Dario article directory on the bilingual article pages.

**Architecture:** A single disclosure navigation serves both breakpoints. The existing header toggle becomes a fixed left toggle on desktop; a small DOM controller handles focus, scroll locking and active headings.

**Tech Stack:** Astro, TypeScript, existing Lucide icons and serif/theme tokens; Bun and happy-dom tests.

**Spec:** [Observed reference and scope](../../audits/2026-10-11-dario-article-toc.md).

## Global Constraints

- Retain the actual renderer IDs, h2/h3 hierarchy and 1024px breakpoint.
- Preserve both fixed languages, themes, instant clay hover, reduced motion and print handling.
- Use existing Actions and verify both full public release SHAs; no new assets or dependencies.

## Review Focus

- Long section bodies continue highlighting their preceding heading.
- Resizing an open mobile menu releases overflow and inert.
- Closing a focused directory returns focus to its visible toggle.
- Modified link clicks preserve native browser behavior.
- 1024px and long CJK headings do not cover the reading column.

### Task 1: Adapt the article directory

**Files:** Modify `src/components/Toc.astro`, `TocToggle.astro`, `src/styles/toc.css`, `src/utils/toc.ts`, `tests/site-output.check.ts`; create `tests/toc-controller.test.ts`.

**Interfaces:** `bindToc(document: Document): () => void` binds the existing `data-toc-toggle`, `#site-toc` and `data-toc-link` elements; `tocHeadings` remains unchanged.

- [x] Write meaningful DOM tests for desktop closing, mobile opening/closing and heading focus, resizing, current section and modified clicks.
- [x] Run `bun test tests/toc-controller.test.ts`; expected failure because the new binding is absent.
- [x] Implement the single nav, Menu/X icon and controller; style the fixed desktop and full-width mobile menu without moving article content.
- [x] Run the DOM suite, `bun run check`, unit suite, bilingual build/output checks; expected all pass. Inspect actual browser layouts and keyboard paths.
- [ ] Commit, obtain independent review, then publish under the existing authorization. Record Actions/public SHA and screenshot evidence in the audit and maintenance guide.
