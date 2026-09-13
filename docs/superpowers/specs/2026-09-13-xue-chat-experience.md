# xue conversation and learning design

User instruction on 2026-09-13 authorizes replacing hand-built interaction with a mature open-source chat frontend, preserving Claude-like styling, desktop/mobile support, friendly truthful error handling, and prioritizing Hermes memory/self-improvement. Existing authorization: public website no login/database, tab session persists refresh; owner Weixin full tools, guests read-only with shared curated memories. This request does not authorize guest memory writes.

## Selected architecture
Reuse Vercel AI SDK useChat and actual AI Elements conversation/message components in an Astro React island. Adapt styling to the site's tokens; retain full container width, lowercase xue/Baby identity, bilingual copy and existing homepage. On the chat route, the header replaces its chat link with a Lucide Home link to the locale homepage, remains visible, and only the message pane scrolls while the composer stays at the bottom. No sidebar/auth/database/model-direct call. AI SDK protocol is opt-in using X-Chat-Protocol: ui-message-v1 on existing /chat-api. Backend continues to accept only {messages:[{role,content}]} and retains existing loopback/auth/rate/size guards. Legacy SSE remains compatible during rollout.

## Interaction acceptance
Streaming, stop, explicit retry/regenerate, copy answer/code, readable streaming markdown, scroll-follow that releases on manual scroll and offers return-to-bottom, IME-safe desktop Enter with Shift+Enter newline, mobile Enter newline plus accessible send button, 44px touch targets, reduced motion, safe-area and mobile visual-viewport handling. Draft/history survive tab refresh using sessionStorage, including safe migration of v1 state. Partial/interrupted answers remain visible; failed retry never duplicates a user turn. Error cards carry safe localized explanation and appropriate next action; quota/auth errors do not encourage immediate retry loops. No raw provider payload, credentials or hidden reasoning exposed. Every transport error path terminates busy state. User follow-up explicitly removes the visible successful-completion label (“回复完成”); successful replies end quietly while busy, stopped and error states remain meaningful. Test with mocked successful and failing streams without paid GLM calls.

## Memory acceptance
Use installed official Hermes v0.21.1 docs/source. Owner native USER.md/MEMORY.md auto writes, session recall, skill creation/self-improvement, bounded background review and reversible curator ledger/backups. Preserve all existing facts/history and public read-only boundary. Identity remains shared across four profiles, learned facts/experiences stored separately. Do not invent personal facts or claim memory learning tested without actual persistence receipts. Configure available official mechanisms first; do not add third-party memory services requiring new keys or send memories to a new provider. Existing GLM quota blocker remains until user confirms recharge; native/fake-model tests can validate mechanism, never claim real-model learning from those.

## Sources
- https://github.com/vercel/chatbot
- https://github.com/vercel/ai-elements
- https://elements.ai-sdk.dev/components/conversation
- https://ai-sdk.dev/docs/ai-sdk-ui/error-handling
- https://github.com/langchain-ai/agent-chat-ui
- https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/
- https://hermes-agent.nousresearch.com/docs/user-guide/features/skills/
