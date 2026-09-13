# xue Conversation and Learning Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development; independent frontend and bridge tasks share the exact protocol below.

**Goal:** Mature reusable conversation interaction and verified native owner learning configuration.
**Architecture:** Vercel React island → existing bridge with opt-in UI-message SSE → public Hermes. Owner learning uses official native configuration only.
**Tech Stack:** Astro, React, AI SDK, AI Elements, Node bridge, Hermes/Python.
**Spec:** docs/superpowers/specs/2026-09-13-xue-chat-experience.md

## Global Constraints
- Preserve lowercase xue, Boss Siyuan Xue/薛思远, Claude-like palette/fonts, full content width and Baby icons; no sidebar, login, website database.
- Public profiles remain read-only; owner Weixin remains full and all curated native memory public-readable.
- Never expose provider error text, credentials, raw private transcripts or hidden reasoning. No paid GLM call until recharge confirmed.
- Existing bridge body remains only messages with role/content. Header X-Chat-Protocol: ui-message-v1 selects AI SDK UI SSE; absent header retains legacy format.
- Safe error codes: quota_exhausted, authentication_failed, rate_limited, context_limit, timeout, upstream_unavailable, interrupted, invalid_request, body_too_large, stream_error. HTTP body {error: code}; UI SSE {type:error,errorText:code}. Preserve Retry-After for rate errors.

### Task 1: Bridge error/protocol behavior
Files services/hermes-chat/server.mjs, new focused helpers beside it if useful; tests/hermes-chat.node.ts and related bridge tests only.
- [ ] Add regression tests for GLM1113 before headers, streamed failure, connection timeout, truncation and secret redaction; UI message protocol successful framing with stable message/text IDs; retain legacy tests.
- [ ] Implement allowlisted error normalization and dual protocol. UI frames start, text-start, text-delta, text-end, finish, DONE. Never finish-success after failed stream. Use actual installed Hermes API source to understand failure payloads. Unrecognized content remains content, never infer errors from ordinary assistant prose.
- [ ] Run focused node bridge tests; commit and report evidence.

### Task 2: Reusable frontend
Files package.json/bun.lock, astro.config.mjs/tsconfig.json, src/pages/chat.astro, src/components/chat/*, directly adapted upstream components, src/utils chat session/transport helpers as needed; frontend tests and open-source attribution. Do not edit backend files.
- [ ] Read official AI SDK and actual AI Elements source/license, pin source revision and retain notices. Install dependencies compatible with Astro7/Node22+, no full Next.js app.
- [ ] Write failing behavior tests for normalization/session recovery/retry/errors; implement React island with useChat + DefaultChatTransport opt-in header and body normalization. Preserve request limits.
- [ ] Reuse actual upstream conversation/message primitives and streaming markdown, adapt site CSS. Handle desktop/mobile interactions, stop, retry/regenerate, scroll, clipboard, storage, accessible localized errors.
- [ ] Run affected tests and check/build; report browser acceptance hooks and commands. Commit.

### Task 3: Native learning rollout (controller)
Files services/hermes-chat owner-learning overlay/guide, shared SOUL if justified, audit. Remote configuration only via Chrome Tencent terminal.
- [ ] Read native config and installed docs, inspect current learning settings and memory sizes without exposing private text.
- [ ] Back up owner config and memory; enable native auto memory/skills reviews with bounded budget and curator backup, preserve read-only profiles. Verify scope switching, fresh shared memory reads and native persisted learning tool receipts.
- [ ] Verify frontend with mock streams/errors at desktop/mobile and preserve screenshot evidence; deploy reviewed bridge/site via existing process; verify public errors without paid model calls. Mark real-model acceptance pending recharge when unavailable.

## Verification and finish
- [ ] Each implementation task reviewed once with exact diff and reported test evidence. Final whole-branch review, one combined fix wave if needed.
- [ ] Maintain ledger; leave no unreported blockers, preserve all preexisting untracked files and prior pending paid checks.
