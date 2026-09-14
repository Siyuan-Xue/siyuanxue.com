# Weixin voice repair and OpenClaw comparison — 2026-09-14

The owner authorized repairing the diagnosed voice failure and comparing Tencent's official OpenClaw integration. Changes were applied directly over the previously authorized SSH connection. No outgoing Weixin messages, model calls, history edits or memory edits were made.

## Cause and repair

The installed Hermes source remains `05d705dd695d1084388529124dc2ffe5ce919e89`; no core patch was applied. Its Weixin adapter prefers downloadable voice media over Weixin-provided transcription. The native local STT backend resolved an English language hint for a Chinese voice recording. A nonempty, malformed English transcript counted as successful and reached GLM as quoted text without explicit voice provenance.

The default, `xue-owner` and `wechat-public` profiles now use automatic language detection (both `stt.language` and `stt.local.language` empty), local multilingual faster-whisper base, VAD, a short vocabulary hint, and no idle model unload. A second fault was reproduced while replaying the clip: a cold model load attempted a Hugging Face `model_info` request and blocked in TCP connection establishment. A 15-second thread traceback confirmed this path. The already-cached model snapshot `ebe41f70d5b6dfa9166e2c581c45c9c0cfc57b66` was copied into `/home/ubuntu/.hermes/models/faster-whisper-base`, dereferencing cache symlinks; model/config/tokenizer/vocabulary hashes were compared. Native configuration now points directly to this local directory, avoiding that metadata request without globally disabling network access or patching dependencies.

The new `voice-context` plugin uses native `pre_gateway_dispatch` to annotate Weixin audio events. It registers no tools and returns only a text rewrite. All other native event fields, including source and control permissions, were verified unchanged. Native transcript enrichment then prepends the actual transcript while retaining the voice note. Ordinary text and other platforms are untouched; processing is idempotent. All three receiving/routed profiles enable the plugin while preserving existing plugins.

The shared SOUL now instructs xue to clarify uncertain/repetitive transcription, avoid mocking or inventing its source, and not turn uncertain recognition into memory. The hook repeats this guidance on each voice message because existing sessions may retain their earlier SOUL snapshot. This is model guidance, not a deterministic recognition-quality filter. Proper names and restaurant names remain possible recognition errors.

## Verification and deployment

- Local Python suite: 21 tests, 20 pass, one existing native-redactor test skipped outside the Hermes environment. `git diff --check` passed.
- Native plugin discovery and actual `MessageEvent` rewriting passed for default, owner and guest Weixin profiles. Effective language resolved to `None` (auto), with the pinned local model present.
- The original cached 50.26-second SILK clip was replayed through the installed owner's native STT and gateway enrichment: **5.97 seconds**, 151 transcript characters including 126 Chinese characters. Nonempty transcript and voice provenance were both present in final enriched input. This time excludes a GLM reply and Weixin transport. It is a single observed replay, not a latency guarantee or transcription-accuracy score.
- Both installed public profiles passed the native read-only verifier: exactly eight final model-visible functions, fresh memory prompt registration, current-time comparison, write and unknown-tool vetoes.
- Compared backed-up and deployed configurations: all non-STT/non-plugin fields remained equal. Shared SOUL links remained valid across all four profiles. Running services have no forced `HERMES_LOCAL_STT_LANGUAGE` environment override.
- Restarted both `hermes-gateway.service` and `hermes-gateway-website-chat.service`; both report active. The bridge health endpoint returned `{"ok":true}` (bridge availability, not model readiness).
- No fresh real Weixin conversation or model response was generated for verification. The next incoming voice uses the new gateway setup.

Protected server backup: `/home/ubuntu/hermes-backups/voice-20260914T103409Z` contains original configs and SOUL. For rollback, restore each corresponding config and shared SOUL, remove the newly introduced voice plugin directories if absent in backup, then restart the gateways. The additional local model directory may remain unused. Original audio, sessions, memories, credentials and routing were preserved.

## Official OpenClaw comparison

Inspected Tencent `openclaw-weixin` commit `7c04adc3e95775efd661ab9fba0626d86d237713`, not a community WeChat bridge.

1. [`process-message.ts`, lines 140–145](https://github.com/Tencent/openclaw-weixin/blob/7c04adc3e95775efd661ab9fba0626d86d237713/src/messaging/process-message.ts#L140): ordinary incoming voice is selected for media download only when it has downloadable media **and no `voice_item.text`**. [`inbound.ts`](https://github.com/Tencent/openclaw-weixin/blob/7c04adc3e95775efd661ab9fba0626d86d237713/src/messaging/inbound.ts#L217) places the provided transcript in the message body. Thus it normally prioritizes Weixin's transcript and avoids a second recognition pass when one exists.
2. Without that text, [`media-download.ts`](https://github.com/Tencent/openclaw-weixin/blob/7c04adc3e95775efd661ab9fba0626d86d237713/src/media/media-download.ts#L71) downloads/decrypts SILK and attempts WAV conversion. It retains raw SILK if conversion is unavailable. The attachment is passed to OpenClaw's media pipeline.
3. [OpenClaw audio documentation](https://docs.openclaw.ai/nodes/audio) describes provider/CLI selection and fallback, and an `[Audio]` body with a transcript after successful core transcription. This audio marker applies to core-transcribed attachments; it should not be assumed for a Weixin text-only transcript path. Recognition quality depends on the supplied transcript or chosen backend and language settings, not the framework name.

[Hermes STT configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration#speech-to-text-stt) documents language configuration and local recognition. Installed source, rather than a broad documentation media table, was used to determine the actual Weixin raw-media preference. Migrating frameworks is not required to repair the observed forced-English and cold-load failures.
