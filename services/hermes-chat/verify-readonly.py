#!/usr/bin/env python3
"""Run with the installed Hermes Python. No network/model calls, no secret output.

--fixture uses a disposable native website-chat profile and synthetic memories.
Default audits HERMES_HOME (the already-installed website profile) without
changing its config or source memories. Native plugin discovery may update its
normal runtime registration cache. --without-plugin is fixture-only.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

EXPECTED = {'web_search', 'web_extract', 'shared_memory_list', 'shared_memory_read',
            'knowledge_list', 'knowledge_read', 'knowledge_search'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hermes-source', required=True, type=Path)
    parser.add_argument('--fixture', action='store_true')
    parser.add_argument('--without-plugin', action='store_true')
    args = parser.parse_args()
    if args.without_plugin and not args.fixture:
        parser.error('--without-plugin requires --fixture')
    sys.path.insert(0, str(args.hermes_source.resolve()))
    import yaml
    with tempfile.TemporaryDirectory(prefix='hermes-readonly-check-') as temporary:
        root = Path(temporary).resolve() / 'hermes'
        if args.fixture:
            home = root / 'profiles/website-chat'
            home.mkdir(parents=True)
            bundle = Path(__file__).resolve().parent
            config = yaml.safe_load((bundle / 'website-profile.yaml').read_text())
            (home / 'config.yaml').write_text(yaml.safe_dump(config))
            os.environ['HERMES_HOME'] = str(home)
            if not args.without_plugin:
                shutil.copytree(bundle / 'website-readonly', home / 'plugins/website-readonly',
                                ignore=shutil.ignore_patterns('__pycache__'))
        else:
            if not os.environ.get('HERMES_HOME'):
                parser.error('set HERMES_HOME to the dedicated installed website-chat profile')
        from hermes_cli.config import load_config
        from hermes_cli.plugins import discover_plugins, render_system_prompt_sections, get_pre_tool_call_directive
        from hermes_cli.tools_config import _get_platform_tools
        from model_tools import get_tool_definitions, handle_function_call
        config = load_config()
        assert config['memory']['memory_enabled'] is False
        assert config['memory']['user_profile_enabled'] is False
        assert config['auxiliary']['background_review']['enabled'] is False
        assert config['mcp_servers'] == {}
        assert config['plugins']['enabled'] == ['website-readonly']
        assert config['platform_toolsets']['api_server'] == ['web', 'website_readonly', 'no_mcp']
        assert config['agent']['reasoning_effort'] == 'high'
        assert config['agent']['max_turns'] == 4
        assert config['agent']['run_budget_seconds'] == 120
        discover_plugins()
        enabled = sorted(_get_platform_tools(config, 'api_server', include_default_mcp_servers=False))
        disabled = config['agent']['disabled_toolsets']
        definitions = get_tool_definitions(enabled, disabled, quiet_mode=True, skip_tool_search_assembly=True)
        names = {definition['function']['name'] for definition in definitions}
        expected = {'web_search','web_extract'} if args.without_plugin else EXPECTED
        assert names == expected, f'Effective schema mismatch: {sorted(names)}'
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
        # Live mode does not print memory names or content.
        if args.fixture:
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
                          'tools':sorted(names), 'prompt_section_registered':True,
                          'write_and_unknown_tool_veto':True}))


if __name__ == '__main__':
    main()
