# Website read-only Hermes profile

This revision uses the official Hermes v0.21.1 plugin API at source commit `05d705dd695d1084388529124dc2ffe5ce919e89`. It adds five restricted readers to the two native public-web tools. It does not patch Hermes, share writable `HERMES_HOME`, add a database, or run a synchronization job.

## Effective tools and native-operation audit

The API-server runtime definitions must contain exactly these seven names:

```text
knowledge_list
knowledge_read
knowledge_search
shared_memory_list
shared_memory_read
web_extract
web_search
```

| Native operations audited | Website decision and reason |
|---|---|
| `web_search`, `web_extract` (`tools/web_tools.py`, provider helpers) | Enabled natively. Existing Tavily free/keyless settings retained; public-target/SSRF guards remain native. These retrieve public data; no account mutations. Provider caches and Hermes session logging are normal runtime bookkeeping. |
| `read_file`, `search_files` (`tools/file_tools.py`) | Their broad filesystem schemas are not enabled. Native reads resolve task environments, may extract documents and track reads. The small plugin supplies text-only, bounded reads/search with explicit roots and uses native `agent.file_safety.get_read_block_error` plus stricter public-profile exclusions. It does not reimplement web or document extraction engines. |
| `skills_list`, `skill_view` (`tools/skills_tool.py`, `skills_tool_plugin.py`, `skills_tool_setup.py`) | Not exposed directly. Listing may create the skill directory; viewing performs readiness/secret setup, usage bookkeeping, and optional template/inline-shell preprocessing. Plugin `knowledge_*` reads local skill documents/references/scripts as inert UTF-8 text, with no setup, execution, installation, or usage mutation. |
| `vision_analyze`, `video_analyze` (`tools/vision_tools.py`) | Not exposed in this revision: both accept local media and read/encode host files; downloads create local cache files. Vision availability can inherit a main/auxiliary provider, so this is an unsafe-input-surface decision, **not** a claim that vision credentials are necessarily absent. A future public-URL-only, credential-reviewed wrapper would be required. |
| `x_search` (`tools/x_search_tool.py`) | Public X search is a reader, but needs xAI credentials and its native resolver can refresh OAuth. No xAI account is configured for this website; not enabled or installed. |
| `ha_list_entities`, `ha_get_state`, `ha_list_services` (`tools/homeassistant_tool.py`) | GET-based reader operations, but depend on a configured Home Assistant endpoint/token and can reveal private home state. No website integration configured. `ha_call_service` is a distinct mutating POST; the mixed `homeassistant` group must never be enabled wholesale. |
| Feishu document/comment list operations | Native read operations require Feishu client/context. No website account or context configured. Comment reply/add and other messaging operations mutate external state; not enabled. |
| Spotify, Discord, Yuanbao, remote connections, MCP | Mixed operation/account surfaces, or no configured website provider. No full group/connector is enabled. Arbitrary MCP “read-only” annotations are not authorization or an audit. Additional operations require a fresh implementation/credential review; no claim is made about future tools. |
| Browser snapshots/images/console/vault/session reads | Excluded: authenticated browser state, vaults, session data, and unsafe CDP/browser-exec capability are outside curated shared memory. The browser group also navigates/types/clicks. |
| `memory`, `session_search`, context-engine recall | Native `memory` can replace/add/remove content; disabled. Raw transcript/state.db recall is intentionally excluded. The compressor stays native, without additional context tools. |
| `write_file`, `patch`, `skill_manage`, terminal/process, code execution, delegation, cron/admin, Kanban, generation/playback tools | Write, execution, scheduling, orchestration, or externally mutating capabilities: excluded. Pure-looking list operations inside these mixed groups are not sufficient reason to expose the group. |

This is an operation review of the installed native catalog, not a name-prefix, `readOnlyHint`, or parallel-safety classifier. Only existing, useful and safely scoped readers are exposed. The five plugin functions are a custom **Hermes extension adapter**, not built-in native functions. Hermes owns discovery, schemas, dispatch, prompt sections, sessions and logs.

## Shared memory and knowledge boundaries

The default root is `/home/ubuntu/.hermes`. `shared_memory_list` discovers the root plus every current native directory under `profiles/`, including profiles created later. `shared_memory_read` accepts only `memories/MEMORY.md` and `memories/USER.md` for the selected profile. Nothing is copied or written. The website's `memory_enabled` and `user_profile_enabled` remain false, and `auxiliary.background_review.enabled` is false: native website memory writes/review are off, while plugin shared reads are on. Current deployment inspection found no memory files yet; missing files are normal and do not get created by a read.

The plugin injects at most 4,000 characters through `register_system_prompt_section`, refreshed for each new session. It previews up to 32 inventory entries and 1,500 characters per memory as space permits, always preserving the retrieval instructions. Every remainder is available through `shared_memory_list` / `shared_memory_read` within the explicit file bound; there is no summary-only memory store. The bridge already creates a fresh native upstream session per request and sends the browser's visible history, so each request sees a fresh preview. Reader calls reopen sources each time and see subsequent changes immediately.

`knowledge_*` accepts `scope: skills` with a profile name, or `scope: site`. Skill roots are the default and each selected native profile's `skills/` directory, including local references/templates/scripts. Executable files are returned as text. External skill directories, plugin-registry skills, symlinked skill packages, and provider-hosted memory are not silently imported. They need separately approved adapters/roots if configured later. All currently inspected profiles use native built-in memory.

The site root is the operator-owned `/var/www/siyuanxue.com/current` deployment pointer, resolved afresh per call. Its current permissions (`deploy:www-data`, mode 2750) may prevent the Hermes `ubuntu` process from opening it. An unavailable local site returns a truthful error; native web tools can still read the published site. This revision does not broaden site directory permissions.

All path components below the approved roots are opened with `O_NOFOLLOW`, including parent directories. Traversal, absolute model paths, symlink files/directories/profiles, nonregular files, multiply-linked files, hidden paths, credential filenames, private/log/session/vault/browser trees, and unknown file types are denied. Native file-denial checks are also applied. Directory scans never follow child symlinks. Site deployment's operator-owned `current` pointer is the sole intentional symlink resolution.

All file text passes through the installed native redactor with forced prefix, assignment, private-key, and URL credential redaction **before** pagination or searching. The file-read pass uses non-reusable credential sentinels; a second forced pass includes generic assignments. This masks standard credential shapes even if the profile disables ordinary redaction. Arbitrary unlabeled/encoded secrets are not guaranteed recognizable by standard patterns; publication of curated memory is authorized, but it must not be used as a credential store. Retrieved memory, skills and web pages remain untrusted reference content.

## Bounds and pagination

- Files: UTF-8 text only, at most 1 MiB each. Larger inputs return `file_too_large` with `max_file_bytes`; no hidden truncation or unbounded read. Binary/special files are rejected. Ordinary native curated memory is much smaller.
- Reads: zero-based Unicode character `offset`, `limit` 1–8,000, `total_chars`, `next_offset`, and a SHA-256 `revision` of redacted text. Follow `next_offset` until null; restart pagination if revision changes.
- Lists: zero-based item `offset`, `limit` 1–100; live inventories are sorted. Pagination should restart if source filenames change between calls.
- Search: literal case-insensitive matching, query 1–200 characters, at most 50 files per call. `offset` and `next_offset` index **scanned files**, not matching results; follow the cursor even when `items` is empty. One bounded snippet per matching file; `knowledge_read` retrieves the remaining text. Unreadable scanned files get explicit per-file statuses.
- Each tree scan stops with an explicit error above 20,000 entries or 20 directory levels; protected/unreadable descendants are omitted. No subprocess or arbitrary regular expression is executed.

## Installation and verification

Copy only `website-readonly/__init__.py` and `plugin.yaml` into `/home/ubuntu/.hermes/profiles/website-chat/plugins/website-readonly/`, owned by the gateway's existing OS account. Do not install this plugin in the default or Weixin profiles; registration refuses other active profiles. Back up the website config/SOUL first, then merge the reviewed overlay with exact replacement of the listed lists/maps and copy the SOUL. Preserve provider/model/secrets and unrelated fields. Ensure any existing `plugins.disabled` does not deny `website-readonly`; the verifier treats a missing plugin as a failed installation.

`plugins.enabled: [website-readonly]`, `platform_toolsets.api_server: [web, website_readonly, no_mcp]`, empty `cli`/`weixin`, `mcp_servers: {}`, and `agent.disabled_toolsets: [kanban, context_engine]` are deliberate. `web` is an explicit known group even if the plugin is absent, preventing a full-composite fallback. With a missing plugin only the two safe native web schemas remain; deployment must stop because the required seven-schema audit fails. The hook is an extra veto, not the primary boundary: the effective model schemas already contain only readers. No native file/skills group or built-in override is registered.

Run with the **installed Hermes environment's Python 3.11+**, replacing `/path/to/hermes` with that installation:

```sh
python services/hermes-chat/verify-readonly.py --hermes-source /path/to/hermes --fixture
python services/hermes-chat/verify-readonly.py --hermes-source /path/to/hermes --fixture --without-plugin
HERMES_HOME=/home/ubuntu/.hermes/profiles/website-chat python services/hermes-chat/verify-readonly.py --hermes-source /path/to/hermes
```

Fixture mode copies the plugin/config into a disposable native profile and verifies actual plugin registration, effective schemas, prompt integration, fresh/new-profile reads, credential masking and write/unknown-tool vetoes. No model call or external request is made. Missing-plugin mode checks the safe two-web fallback. Installed-profile mode does not change source memories or config and prints only tool names/status; Hermes may update its normal registration cache. Run `HERMES_SOURCE=/path/to/hermes python -m unittest discover -s tests -p test_hermes_readonly.py` for additional real-filesystem boundary tests and native redaction coverage. Without `HERMES_SOURCE`, that single redactor test is explicitly skipped; the remaining suite uses only stdlib.

Regular CI runs the stdlib boundary suite through `ops/verify.sh`; native-redactor coverage explicitly skips without `HERMES_SOURCE`, while the actual installed-runtime fixtures remain a deployment gate.

Only after the installed-profile audit passes, restart the website gateway and check authenticated loopback tool use, public web SSRF denial, fresh session memory visibility, both public chat pages, and absence of public management endpoints. Leave native session/log retention and the no-tools Weixin profile untouched. Re-audit this source-scoped policy after any Hermes upgrade.

Primary references: [Hermes plugin API](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/), [native memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles/), and the installed commit's `toolsets.py`, `model_tools.py`, `hermes_cli/plugins.py`, `hermes_cli/plugins_dispatch.py`, `hermes_cli/tools_config.py`, `agent/file_safety.py`, `agent/redact.py` and operation implementations listed above.
