# Owner memory and learning

The reviewed `owner-learning-profile.yaml` is a partial overlay for **xue-owner only**. Preserve model credentials, routing, transport and all existing data when merging it. Public profiles explicitly disable memory/skill background review and curator maintenance. Their reviewed shared-memory readers still read all curated native memory freshly; raw conversations remain private.

## What learns

- `USER.md`: confirmed personal facts, preferences, long-term goals and corrections about Siyuan Xue. The owner profile has a 4,000-character budget instead of the 1,375-character default.
- `MEMORY.md`: verified working context and reusable lessons, with a 6,000-character budget instead of 2,200.
- `session_search`: retrieves supporting owner conversation history rather than stuffing entire transcripts into the always-loaded memory. Existing migrated history is preserved.
- `skill_manage`: creates and improves reusable procedures after they have actually worked. Mutations have a native audit ledger and before/after backups.

Memory is loaded as a frozen snapshot at session start for prefix caching; writes persist immediately and tool results show current state. A new session reads the updated snapshot. Memory is **bounded**, not infinite: writes over capacity fail explicitly; foreground tools must consolidate carefully. Current native background-review policy stages replacements/removals for approval, even with normal foreground write approval disabled. Do not bypass that native protection or report staged operations as saved.

## Learning cadence and cost

The owner can save confirmed facts immediately through the memory tool. In addition, native memory review is nudged every five user turns, and skill review after ten tool iterations. The review is launched after delivery of a non-interrupted reply and uses the same GLM model and reasoning as its parent, preserving the warm prompt prefix. The explicit aggregate input budget is 120,000 tokens per review versus the native 600,000 default. It is checked between requests, so the request that crosses the threshold completes and aggregate usage can overshoot. This overlay adds no independent wall-clock or API timeout; the review retains the existing provider/model request timeout. No new provider, external memory account or scheduled model job is introduced.

`display.memory_notifications: "on"` shows native successful update receipts on Weixin. The notification is not an assertion that every turn created a new memory. A failed provider call cannot establish real-model learning.

Curator configuration retains native weekly/idle housekeeping, deterministic stale/archive maintenance, five recovery backups and the mutation ledger. LLM consolidation is off, built-ins are not pruned, archives are not purged. **Installed-version limitation:** gateway housekeeping calls curator in the gateway's primary home, not every routed profile. The owner configuration therefore applies when native curator is invoked in that profile (e.g. owner CLI); automatic owner skill creation/improvement is handled by the post-turn review. Do not claim that the multiplexed gateway automatically runs owner-profile weekly consolidation.

## Owner controls

In the verified owner channel, `/memory` inspects curated memory and `/memory pending` shows staged consolidation proposals. `/refine` requests native review of the current session; it consumes model tokens. `/skills` is the native skills entry point. These administrative controls stay unavailable to public guests. The shared SOUL defines universal xue identity; it is not a biography database or a substitute for actual tool writes.

## Evidence and limits

An isolated native fixture verified memory add, correction, reload into a new snapshot, the fifth-turn nudge, review configuration/budget, native skill create/patch, ledger and backup blobs, without making any model call. The fixture did not touch live personal memory. Server rollout and any real-model acceptance are recorded separately in the deployment audit. Existing GLM code1113/balance exhaustion must be resolved before claiming post-rollout autonomous learning has been exercised through the model.

Official sources: [persistent memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/), [skills](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/), [file responsibilities](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what).
