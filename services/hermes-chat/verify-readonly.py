#!/usr/bin/env python3
"""Run with the installed Hermes Python. No network/model calls, no secret output.

--fixture uses a disposable native website-chat or wechat-public profile and synthetic memories.
Default audits HERMES_HOME (an already-installed public profile) without
changing its config or source memories. Native plugin discovery may update its
normal runtime registration cache. --without-plugin is fixture-only.
"""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

EXPECTED = {'current_datetime', 'web_search', 'web_extract', 'shared_memory_list', 'shared_memory_read',
            'knowledge_list', 'knowledge_read', 'knowledge_search'}
PROFILES = {
    'website-chat': ('website-profile.yaml', 'api_server'),
    'wechat-public': ('wechat-public-profile.yaml', 'weixin'),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hermes-source', required=True, type=Path)
    parser.add_argument('--fixture', action='store_true')
    parser.add_argument('--without-plugin', action='store_true')
    parser.add_argument('--profile', choices=PROFILES, default='website-chat')
    args = parser.parse_args()
    if args.without_plugin and not args.fixture:
        parser.error('--without-plugin requires --fixture')
    sys.path.insert(0, str(args.hermes_source.resolve()))
    import yaml
    with tempfile.TemporaryDirectory(prefix='hermes-readonly-check-') as temporary:
        root = Path(temporary).resolve() / 'hermes'
        overlay_name, platform = PROFILES[args.profile]
        if args.fixture:
            home = root / 'profiles' / args.profile
            home.mkdir(parents=True)
            bundle = Path(__file__).resolve().parent
            config = yaml.safe_load((bundle / overlay_name).read_text())
            (home / 'config.yaml').write_text(yaml.safe_dump(config))
            os.environ['HERMES_HOME'] = str(home)
            if not args.without_plugin:
                shutil.copytree(bundle / 'website-readonly', home / 'plugins/website-readonly',
                                ignore=shutil.ignore_patterns('__pycache__'))
        else:
            if not os.environ.get('HERMES_HOME'):
                parser.error('set HERMES_HOME to the dedicated installed public profile')
        from hermes_cli.config import load_config
        from hermes_cli.plugins import discover_plugins, render_system_prompt_sections, get_pre_tool_call_directive
        from hermes_cli.tools_config import _get_platform_tools
        from model_tools import get_tool_definitions, handle_function_call
        config = load_config()
        assert config['memory']['memory_enabled'] is False
        assert config['memory']['user_profile_enabled'] is False
        assert config['auxiliary']['background_review']['enabled'] is False
        assert config['skills']['creation_nudge_interval'] == 0
        assert config['skills']['write_approval'] is True
        assert config['curator']['enabled'] is False
        assert config['mcp_servers'] == {}
        assert config['timezone'] == 'Asia/Shanghai'
        assert config['plugins']['enabled'] == ['website-readonly']
        assert config['platform_toolsets'][platform] == ['web', 'website_readonly', 'no_mcp']
        for other in {'api_server', 'cli', 'weixin'} - {platform}:
            assert config['platform_toolsets'][other] == []
        assert config['agent']['reasoning_effort'] == 'high'
        assert config['agent']['max_turns'] == 4
        assert config['agent']['run_budget_seconds'] == 120
        assert config['tools']['tool_search']['enabled'] == 'off'
        discover_plugins()
        enabled = sorted(_get_platform_tools(config, platform, include_default_mcp_servers=False))
        disabled = config['agent']['disabled_toolsets']
        raw_definitions = get_tool_definitions(enabled, disabled, quiet_mode=True, skip_tool_search_assembly=True)
        # The model receives final assembly, not the raw registered catalog.
        # Default auto defers plugin schemas behind blocked bridge tools.
        definitions = get_tool_definitions(enabled, disabled, quiet_mode=True)
        names = {definition['function']['name'] for definition in definitions}
        expected = {'web_search','web_extract'} if args.without_plugin else EXPECTED
        assert names == expected, f'Final model-visible schema mismatch: {sorted(names)}'
        raw_names = {definition['function']['name'] for definition in raw_definitions}
        assert raw_names == expected, f'Raw registered schema mismatch: {sorted(raw_names)}'
        if args.without_plugin:
            print(json.dumps({'ok':True, 'plugin_missing_fails_closed':True, 'tools':sorted(names)}))
            return
        for definition in definitions:
            if definition['function']['name'] not in {'web_search','web_extract'}:
                assert definition['function']['parameters']['additionalProperties'] is False
        sections = render_system_prompt_sections({'session_id':'readonly-verification'})
        section = next(section for section in sections if section.id == 'website.shared-memory')
        assert len(section.content) <= 4000 and 'shared_memory_read' in section.content
        assert get_pre_tool_call_directive('write_file', {'path':'/tmp/never-write','content':'x'})[0] == 'block'
        assert get_pre_tool_call_directive('arbitrary_mcp_reader', {})[0] == 'block'
        def call(name, arguments):
            return json.loads(handle_function_call(name, arguments, task_id='readonly-verification',
                              enabled_toolsets=enabled, disabled_toolsets=disabled))
        listing = call('shared_memory_list', {'limit':4})
        assert listing['ok'] and len(listing['items']) <= 4
        from hermes_time import now as hermes_now
        before = hermes_now()
        clock = call('current_datetime', {})
        after = hermes_now()
        local = datetime.fromisoformat(clock['local_time'])
        utc = datetime.fromisoformat(clock['utc_time'])
        assert clock['ok'] and local.utcoffset() is not None
        assert clock['timezone'] == 'Asia/Shanghai'
        assert int(before.timestamp()) <= clock['epoch_seconds'] <= int(after.timestamp())
        assert utc == local.astimezone(timezone.utc)
        assert clock['epoch_seconds'] == int(local.timestamp())
        assert clock['weekday'] == ('Monday', 'Tuesday', 'Wednesday', 'Thursday',
                                    'Friday', 'Saturday', 'Sunday')[local.weekday()]
        assert call('current_datetime', {'unexpected':True})['error'] == 'invalid_arguments'
        # Live mode does not print memory names or content.
        if args.fixture:
            # Reproduce the original integration failure with the actual native
            # assembler and registered plugin tools, without changing config:
            # auto hides readers behind bridges that this profile must deny.
            from tools.tool_search import assemble_tool_defs, ToolSearchConfig
            legacy = assemble_tool_defs(raw_definitions, context_length=0,
                                        config=ToolSearchConfig.from_raw({'enabled':'auto'}))
            legacy_names = {definition['function']['name'] for definition in legacy.tool_defs}
            assert {'tool_search','tool_describe','tool_call'} <= legacy_names
            assert 'shared_memory_read' not in legacy_names
            for bridge in ('tool_search', 'tool_describe', 'tool_call'):
                assert get_pre_tool_call_directive(bridge, {})[0] == 'block'
            memory = root / 'memories/MEMORY.md'
            memory.parent.mkdir()
            memory.write_text('First fixture memory\nAPI_KEY=opaque-secret-test-value')
            result = call('shared_memory_read', {'document':'MEMORY.md'})
            assert result['ok'] and 'First fixture memory' in result['content']
            assert 'opaque-secret-test-value' not in result['content']
            memory.write_text('Fresh fixture memory')
            assert call('shared_memory_read', {'document':'MEMORY.md'})['content'] == 'Fresh fixture memory'
            other = root / 'profiles/future-reader/memories/USER.md'
            other.parent.mkdir(parents=True)
            other.write_text('Future profile fixture')
            assert call('shared_memory_read', {'profile':'future-reader','document':'USER.md'})['content'] == 'Future profile fixture'
            sections = render_system_prompt_sections({'session_id':'new-fixture-session'})
            assert any('Fresh fixture memory' in section.content for section in sections)
            # Exercise the actual hook+dispatch path against a disposable file.
            call('write_file', {'path':str(memory), 'content':'modified'})
            assert memory.read_text() == 'Fresh fixture memory'
        print(json.dumps({'ok':True, 'mode':'fixture' if args.fixture else 'installed-profile',
                          'profile':args.profile, 'platform':platform,
                          'tools':sorted(names), 'prompt_section_registered':True,
                          'final_model_schemas_checked':True,
                          'raw_model_schemas_checked':True,
                          'clock_native_comparison_checked':True,
                          'auto_deferral_regression_checked':args.fixture,
                          'write_and_unknown_tool_veto':True}))


if __name__ == '__main__':
    main()
