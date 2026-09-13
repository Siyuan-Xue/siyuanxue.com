# Hermes tooling and channel identity rollout

Server audit: 2026-09-13, Asia/Shanghai. Official Hermes v0.21.1 at `05d705dd695d1084388529124dc2ffe5ce919e89`; application bundle `3c1b458`. Remote work used the authenticated Tencent Cloud terminal in Chrome. Credentials and raw transcripts are excluded from this report.

## Applied configuration

All four installed profiles (`default`, `website-chat`, `wechat-public`, `xue-owner`) use one canonical `/home/ubuntu/.hermes/shared/SOUL.md` through symlinks. SHA-256 equality was verified. Identity is 小薛 / lowercase `xue`, a general assistant for 薛思远 / Siyuan Xue (Boss), with channel permissions determined independently. Stable public biography and directly supplied preferences are curated in the owner's native `memories/USER.md`; public profiles read this file freshly through the reviewed plugin.

The default gateway is the official multiplexer. Its allowlist is exactly `wechat-public` and `xue-owner`; `website-chat` keeps its separate systemd service and loopback API. Routing is an exact Weixin `chat_id` match for the bound owner to `xue-owner`, followed by a platform-wide Weixin catch-all to `wechat-public`. The owner's saved iLink account ID was matched against the original session sender and existing `allow_admin_from`; no identity was inferred from a message claiming to be Boss.

Only `wechat-public` owns the enabled Weixin adapter and login credentials. `xue-owner` has only the existing model credential and browser executable setting; its transport is disabled. The default Weixin toolset is empty. Each relevant scope has the bound owner in `allow_admin_from` and `group_allow_admin_from`; guests may use only `new`, `reset`, `stop`, plus the native `help`/`whoami` floor. Groups remain disabled. Exact, unknown, suffixed and empty-ID routing cases and sensitive slash-command denials passed native checks.

Owner toolsets are native `hermes-weixin` / `hermes-cli` plus `video` and `no_mcp`, with memory and user-profile writes enabled. GLM-5.3/high is preserved, with 30 iterations and 300 seconds maximum. Public profiles have exactly eight final model-visible tools, four iterations and 120 seconds; memory mutation/background review are off, tool discovery bridges are off, and a pre-tool hook rejects every non-allowlisted tool. Both use the native free Tavily search/extract backend with keyless fallback/rescue. No paid search account was created.

Google Chrome 153.0.8010.36 was installed from Google's official `.deb` after the Chrome-for-Testing storage download repeatedly timed out. `AGENT_BROWSER_EXECUTABLE_PATH=/usr/bin/google-chrome` is scoped to the owner. Native agent-browser is obtained through the official npm package. Existing ffmpeg is available. No browser account/cookies were imported.

## Findings in the previous Weixin conversation

The original database contained 19 messages and zero structured tool calls/tool-result rows. The old profile had no Weixin tools, a two-iteration cap, disabled native memory, and a generic Hermes identity. Assistant text imitated Bash and memory markers, claimed execution/persistence without receipts, and repeated September 11 when the NTP-synchronized server was already September 13. These were model/tool-configuration failures, not an incorrect host clock.

The installed version also omits the `profile` argument in `agent/inline_tool_executors.py::_session_search`, although the native tool schema/direct implementation supports it. A real-model recall test therefore searched its current empty profile repeatedly. No Hermes source was patched: the original owner's Weixin database was consistently snapshotted into the new owner profile, after backing up the owner's test database. Original history remains unchanged in `wechat-public`; current-profile native recall now returns that session. Public tools still cannot read raw session databases.

## Verification observed

- All 18 focused tests passed under the installed Python 3.11, including the actual Hermes redactor integration.
- Both native public fixtures passed exact raw/final eight-schema, clock, fresh-memory, redaction and write-veto checks. Both missing-plugin fixtures failed closed to the two native web tools.
- Both installed public-profile audits passed after rollout.
- In one process, native profile scopes switched owner → guest → owner → website: owner writers stayed unblocked, both guest scopes retained eight readers and blocked writers, and both read the owner's saved Boss identity. The owner had 35 available definitions outside gateway mode; cron requires the native gateway/interactive flag and was checked separately.
- Actual GLM-5.3/high produced structured `terminal` and `web_search` calls, two tool results, correct xue/Boss identity, and `2026-09-13 16:08:46+08:00`. The host comparison ended at `16:08:56+08:00`.
- Native Tavily search succeeded in 2.56 seconds; webpage extraction returned official Hermes documentation. Search ranking itself is not evidence that a result is authoritative; the model must still check sources/dates.
- Native browser navigation to the overseas docs timed out waiting for load, but the following browser snapshot successfully returned the actual documentation DOM.
- The memory model test made a real `memory` call and the Boss identity was verified on disk. Stable public facts were then added through native `memory_tool`, with success receipts and no raw transcript copied into memory.
- The new default gateway is active, with `wechat-public:weixin` connected and served profiles exactly default/wechat-public/xue-owner. The separate website gateway remains active. The old standalone Weixin service is disabled to avoid duplicate polling.

## Remaining acceptance limit

During the later recall test, GLM returned HTTP 429 / code `1113`: insufficient balance or no usable resource package. The user was asked to recharge the existing China metered account. No additional model requests are made until recharge is confirmed. Post-rollout website model use of the new clock and the final model-level history recall remain unverified; native dispatch/configuration checks passed. Vision/video use the native auxiliary routing but paid inference cannot be validated while the balance is exhausted. Image/video generation, X-specific search, third-party connectors and desktop control are not claimed operational without their required account/service/environment.

## Recovery

Protected backup: `/home/ubuntu/hermes-backups/tooling-20260913T155325`; `planned/manifest.json` records preflight and staged configuration hashes, and `rollout-before/` holds the immediate pre-rollout files, plugin copies, and SQLite snapshots. These directories contain sensitive configuration and must not be published. The rollout compared each active config with its preflight hash before mutation and included rollback on installation failure. Old standalone Weixin service state was cleared after disabling it. To revert deliberately, stop the default gateway, restore the captured configurations/SOUL/plugin files, enable/start the old Weixin service, and restart the website service. Preserve all newer owner history/memory before reverting.

Official references: [tools](https://hermes-agent.nousresearch.com/docs/user-guide/features/tools/), [web search](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-search/), [browser](https://hermes-agent.nousresearch.com/docs/user-guide/features/browser/), [multi-profile routing](https://hermes-agent.nousresearch.com/docs/user-guide/multi-profile-gateways/), [Weixin](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/weixin/).
