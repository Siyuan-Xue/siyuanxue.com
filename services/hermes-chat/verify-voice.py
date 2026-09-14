#!/usr/bin/env python3
"""Verify installed native voice dispatch and optionally replay cached audio.

Run with the Hermes venv and HERMES_HOME set. No model or messaging calls.
The optional replay uses the configured STT backend; production uses local STT.
"""
import argparse
import asyncio
from dataclasses import fields
import json
from pathlib import Path
import sys
import time
from types import SimpleNamespace


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hermes-source', required=True, type=Path)
    parser.add_argument('--audio', type=Path)
    args = parser.parse_args()
    sys.path.insert(0, str(args.hermes_source.resolve()))
    from hermes_cli.plugins import discover_plugins
    from tools.transcription_tools import _load_stt_config, _resolve_stt_language
    from gateway.config import Platform
    from gateway.platforms.base import MessageEvent, MessageType
    from gateway.session import SessionSource
    from gateway.run_inbound import GatewayInboundMixin

    config = _load_stt_config()
    assert config['enabled'] is True and config['provider'] == 'local'
    assert _resolve_stt_language('local', config) is None
    model_path = Path(config['local']['model'])
    assert model_path.name == 'faster-whisper-base' and (model_path / 'model.bin').is_file()
    discover_plugins()
    runner = GatewayInboundMixin()
    runner.config = SimpleNamespace(stt_enabled=True)
    source = SessionSource(platform=Platform.WEIXIN, chat_id='voice-verification', user_id='test-only')
    incoming = MessageEvent(text='', message_type=MessageType.VOICE, source=source,
                            media_urls=[str(args.audio or '/cache/test.silk')], media_types=['audio/silk'])
    rewritten = runner._hm_pre_gateway_dispatch_hook(incoming, source)
    marker = '[Weixin voice message / 微信语音消息]'
    assert rewritten is not None and marker in rewritten.text
    for field in fields(incoming):
        if field.name != 'text':
            assert getattr(incoming, field.name) == getattr(rewritten, field.name), field.name
    ordinary = MessageEvent(text='ordinary text', source=source)
    assert runner._hm_pre_gateway_dispatch_hook(ordinary, source) is ordinary
    report = {'ok': True, 'language': 'auto', 'model': 'base',
              'native_hook': True, 'event_permissions_preserved': True}
    if args.audio:
        started = time.monotonic()
        text, transcripts = asyncio.run(runner._enrich_message_with_transcription(rewritten.text, [str(args.audio)]))
        assert len(transcripts) == 1 and transcripts[0].strip(), 'STT did not produce a transcript'
        assert marker in text and transcripts[0] in text, 'Gateway lost voice provenance or transcript'
        transcript = transcripts[0]
        report.update(replay_seconds=round(time.monotonic() - started, 2),
                      transcript_characters=len(transcript),
                      chinese_characters=sum('\u4e00' <= char <= '\u9fff' for char in transcript),
                      voice_provenance_in_final_input=True)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
