"""Real filesystem boundary tests; optional official redactor via HERMES_SOURCE."""
import importlib.util
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock
from zoneinfo import ZoneInfo

PLUGIN = Path(__file__).resolve().parents[1] / 'services/hermes-chat/website-readonly/__init__.py'


def load_plugin():
    assert PLUGIN.is_file(), 'website read-only plugin is not implemented'
    spec = importlib.util.spec_from_file_location('website_readonly_test', PLUGIN)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeContext:
    """Only documented plugin API; handler shapes match Hermes registry."""
    def __init__(self, profile_name='website-chat'):
        self.profile_name = profile_name
        self.tools, self.sections, self.hooks = {}, {}, {}
    def register_tool(self, name, toolset, schema, handler, **kwargs):
        self.tools[name] = (schema, handler, toolset)
        return object()
    def register_system_prompt_section(self, id, content, **kwargs):
        assert 0 < kwargs['max_chars'] <= 4000, 'official Hermes prompt section limit'
        self.sections[id] = (content, kwargs)
    def register_hook(self, name, callback):
        self.hooks[name] = callback


class ReadonlyTests(unittest.TestCase):
    def setUp(self):
        self.plugin = load_plugin()
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.root, self.site = self.base / 'hermes', self.base / 'site'
        self.root.mkdir(); self.site.mkdir()
        self.readers = self.plugin.Readers(self.root, self.site, lambda s: s, lambda p: None)
    def put(self, path, content):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return path
    def call(self, name, **args):
        return json.loads(self.readers.call(name, args))
    def test_current_datetime_advances_across_midnight_and_is_consistent(self):
        moments = iter((
            datetime(2026, 9, 13, 23, 59, 59, tzinfo=ZoneInfo('Asia/Shanghai')),
            datetime(2026, 9, 14, 0, 0, 1, tzinfo=ZoneInfo('Asia/Shanghai')),
        ))
        readers = self.plugin.Readers(
            self.root, self.site, lambda s: s, lambda p: None, now=lambda: next(moments)
        )
        first = json.loads(readers.call('current_datetime', {}))
        second = json.loads(readers.call('current_datetime', {}))
        self.assertEqual(first, {
            'ok': True,
            'local_time': '2026-09-13T23:59:59+08:00',
            'timezone': 'Asia/Shanghai',
            'utc_time': '2026-09-13T15:59:59+00:00',
            'epoch_seconds': 1789315199,
            'weekday': 'Sunday',
        })
        self.assertEqual(second['local_time'], '2026-09-14T00:00:01+08:00')
        self.assertEqual(second['utc_time'], '2026-09-13T16:00:01+00:00')
        self.assertEqual(second['epoch_seconds'], 1789315201)
        self.assertEqual(second['weekday'], 'Monday')

    def test_current_datetime_uses_a_fresh_aware_real_clock(self):
        before = datetime.now().astimezone() - timedelta(seconds=1)
        result = self.call('current_datetime')
        after = datetime.now().astimezone() + timedelta(seconds=1)
        local = datetime.fromisoformat(result['local_time'])
        utc = datetime.fromisoformat(result['utc_time'])
        self.assertTrue(result['ok'])
        self.assertIsNotNone(local.utcoffset())
        self.assertLessEqual(before.timestamp(), result['epoch_seconds'])
        self.assertLessEqual(result['epoch_seconds'], after.timestamp())
        self.assertEqual(utc, local.astimezone(timezone.utc))
        self.assertEqual(result['epoch_seconds'], int(local.timestamp()))
        self.assertEqual(result['weekday'], ('Monday', 'Tuesday', 'Wednesday', 'Thursday',
                                             'Friday', 'Saturday', 'Sunday')[local.weekday()])
        self.assertTrue(result['timezone'])

    def test_current_datetime_rejects_arguments_and_unaware_or_failed_clocks(self):
        self.assertEqual(self.call('current_datetime', timezone='UTC')['error'], 'invalid_arguments')
        for clock in (lambda: datetime(2026, 9, 13), lambda: (_ for _ in ()).throw(RuntimeError('boom'))):
            readers = self.plugin.Readers(
                self.root, self.site, lambda s: s, lambda p: None, now=clock
            )
            result = json.loads(readers.call('current_datetime', {}))
            self.assertEqual(result, {'ok': False, 'error': 'clock_unavailable'})
    def test_memories_are_fresh_across_profiles_and_new_profiles(self):
        self.put(self.root / 'memories/MEMORY.md', 'first')
        self.put(self.root / 'profiles/wechat-public/memories/USER.md', 'Weixin knowledge')
        self.assertEqual(self.call('shared_memory_read', profile='default', document='MEMORY.md')['content'], 'first')
        self.put(self.root / 'memories/MEMORY.md', 'updated')
        self.put(self.root / 'profiles/future/memories/MEMORY.md', 'future knowledge')
        listing = self.call('shared_memory_list')['items']
        self.assertIn({'profile': 'future', 'document': 'MEMORY.md', 'status': 'available'}, listing)
        self.assertEqual(self.call('shared_memory_read', profile='default', document='MEMORY.md')['content'], 'updated')
        self.assertIn('Weixin knowledge', self.readers.prompt({}))
        self.assertIn('future knowledge', self.readers.prompt({}))
    def test_missing_memories_report_without_creating_files(self):
        self.assertEqual(self.call('shared_memory_read', profile='default', document='MEMORY.md')['error'], 'not_found')
        self.assertEqual(self.call('shared_memory_list')['items'][0]['status'], 'not_found')
        self.assertFalse((self.root / 'memories').exists())
        self.assertIn('shared_memory_read', self.readers.prompt({}))
    def test_writes_unknown_tools_and_schema_escape_are_denied(self):
        path = self.put(self.root / 'memories/MEMORY.md', 'unchanged')
        for name in ('memory', 'session_search', 'write_file', 'patch', 'terminal', 'execute_code',
                     'skill_view', 'delegate_task', 'tool_search', 'tool_describe', 'tool_call',
                     'future_tool'):
            self.assertEqual(self.call(name, content='modified')['error'], 'tool_denied')
        self.assertEqual(self.call('shared_memory_read', profile='default', document='MEMORY.md', content='modified')['error'], 'invalid_arguments')
        self.assertEqual(path.read_text(), 'unchanged')
    def test_profile_document_and_file_traversal_denied(self):
        for profile in ('..', '../secret', '/etc', 'x/y', 'x\\y'):
            self.assertEqual(self.call('shared_memory_read', profile=profile, document='MEMORY.md')['error'], 'invalid_arguments')
        for document in ('../config.yaml', 'state.db', 'USER.md/../.env'):
            self.assertEqual(self.call('shared_memory_read', document=document)['error'], 'invalid_arguments')
        for path in ('../secret.md', '/etc/passwd', 'x/../../secret.md', 'x\\..\\secret.md'):
            self.assertEqual(self.call('knowledge_read', scope='site', path=path)['error'], 'invalid_arguments')
    def test_symlink_files_directories_and_profiles_never_escape(self):
        secret = self.put(self.base / 'outside/secret.md', 'SECRET')
        (self.site / 'leak.md').symlink_to(secret)
        (self.site / 'nested').symlink_to(secret.parent, target_is_directory=True)
        (self.root / 'profiles').mkdir()
        (self.root / 'profiles/evil').symlink_to(secret.parent, target_is_directory=True)
        self.put(self.root / 'memories/USER.md', 'safe')
        (self.root / 'memories/MEMORY.md').symlink_to(secret)
        for name, args in [('knowledge_read', {'scope':'site', 'path':'leak.md'}), ('knowledge_read', {'scope':'site', 'path':'nested/secret.md'}), ('shared_memory_read', {'document':'MEMORY.md'}), ('shared_memory_read', {'profile':'evil', 'document':'MEMORY.md'})]:
            self.assertFalse(self.call(name, **args)['ok'])
        self.assertNotIn('SECRET', self.readers.prompt({}))
        self.assertEqual(self.call('knowledge_list', scope='site')['items'], [])
    def test_sessions_credentials_hidden_files_and_native_guards_are_excluded(self):
        for path in ('state.db', '.env', 'config.yaml', 'auth.json', 'credentials.json', 'logs/chat.md', 'sessions/chat.md', 'browser-profile/vault.md', '.git/config', 'secret.key'):
            self.put(self.site / path, 'SECRET')
            self.assertFalse(self.call('knowledge_read', scope='site', path=path)['ok'], path)
        self.put(self.site / 'safe.md', 'public')
        self.assertEqual(self.call('knowledge_list', scope='site')['items'], ['safe.md'])
        self.readers.read_guard = lambda path: 'native policy denial'
        self.assertFalse(self.call('knowledge_read', scope='site', path='safe.md')['ok'])
        self.assertEqual(self.call('knowledge_list', scope='site')['items'], [])
    def test_skills_are_inert_and_references_readable(self):
        content = '# skill\n!`touch /tmp/should-never-run`\n'
        self.put(self.root / 'skills/demo/SKILL.md', content)
        self.put(self.root / 'skills/demo/references/guide.md', 'Guide')
        before = sorted(str(p.relative_to(self.root)) for p in self.root.rglob('*'))
        self.assertEqual(self.call('knowledge_read', scope='skills', path='demo/SKILL.md')['content'], content)
        self.assertEqual(self.call('knowledge_list', scope='skills')['items'], ['demo/SKILL.md', 'demo/references/guide.md'])
        self.assertEqual(self.call('knowledge_search', scope='skills', query='Guide')['items'][0]['path'], 'demo/references/guide.md')
        self.assertEqual(before, sorted(str(p.relative_to(self.root)) for p in self.root.rglob('*')))
    def test_read_and_list_pagination_do_not_lose_remainder(self):
        content = '甲乙丙丁戊己'
        self.put(self.root / 'memories/MEMORY.md', content)
        chunks, offset = [], 0
        while offset is not None:
            page = self.call('shared_memory_read', document='MEMORY.md', offset=offset, limit=2)
            chunks.append(page['content']); offset = page['next_offset']
        self.assertEqual(''.join(chunks), content)
        for name in ('a.md','b.md','c.md'): self.put(self.site/name, name)
        first = self.call('knowledge_list', scope='site', limit=2)
        second = self.call('knowledge_list', scope='site', offset=first['next_offset'], limit=2)
        self.assertEqual(first['items']+second['items'], ['a.md','b.md','c.md'])
    def test_bounds_binary_and_special_files_fail_safely(self):
        self.put(self.site / 'huge.md', 'x' * (1024 * 1024 + 1))
        self.assertEqual(self.call('knowledge_read', scope='site', path='huge.md')['error'], 'file_too_large')
        (self.site / 'binary.md').write_bytes(b'hello\x00world')
        self.assertEqual(self.call('knowledge_read', scope='site', path='binary.md')['error'], 'unsupported_text')
        os.mkfifo(self.site / 'pipe.md')
        self.assertFalse(self.call('knowledge_read', scope='site', path='pipe.md')['ok'])
        for offset, limit in [(-1, 5), (False, 5), (0, 0), (0, 8001), (0, True)]:
            self.assertEqual(self.call('knowledge_read', scope='site', path='huge.md', offset=offset, limit=limit)['error'], 'invalid_arguments')
    def test_prompt_is_bounded_and_explains_retrievable_overflow(self):
        self.put(self.root / 'memories/MEMORY.md', 'x' * 50000 + 'END-OF-MEMORY')
        prompt = self.readers.prompt({})
        self.assertLessEqual(len(prompt), 4000)
        self.assertIn('shared_memory_list', prompt)
        self.assertIn('shared_memory_read', prompt)
        self.assertIn('next_offset', prompt)
        self.assertEqual(self.call('shared_memory_read', document='MEMORY.md', offset=50000)['content'], 'END-OF-MEMORY')
    def test_search_is_literal_redacted_and_paginates_scanned_files(self):
        self.put(self.site / 'a.md', 'first safe')
        self.put(self.site / 'b.md', 'needle [a-z]+ secret')
        self.readers.redact = lambda s: s.replace('secret', '[redacted]')
        page = self.call('knowledge_search', scope='site', query='[a-z]+', limit=1)
        self.assertEqual(page['items'], [])
        self.assertEqual(page['next_offset'], 1)
        page = self.call('knowledge_search', scope='site', query='[a-z]+', offset=1, limit=1)
        self.assertEqual(page['items'][0]['path'], 'b.md')
        self.assertNotIn('secret', json.dumps(page))
    def test_unreadable_site_is_reported_without_blocking_memories(self):
        readers = self.plugin.Readers(self.root, self.base / 'missing-site', lambda s:s, lambda p:None)
        self.assertEqual(json.loads(readers.call('knowledge_list', {'scope':'site'}))['error'], 'not_found')
        self.assertIn('shared_memory_read', readers.prompt({}))
    @unittest.skipUnless(os.environ.get('HERMES_SOURCE'), 'set HERMES_SOURCE for installed official redaction')
    def test_official_redactor_is_used_before_paging(self):
        sys.path.insert(0, os.environ['HERMES_SOURCE'])
        from agent.redact import redact_sensitive_text
        self.readers.redact = self.plugin.make_redactor(redact_sensitive_text)
        secret = 'sk-' + 'a' * 48
        self.put(self.root / 'memories/MEMORY.md', 'API_KEY=opaque-private-value\n'+secret+'\nhttps://user:pass@example.com/?token=opaque-secret\n-----BEGIN PRIVATE KEY-----\nabcdef\n-----END PRIVATE KEY-----')
        result = self.call('shared_memory_read', document='MEMORY.md')['content']
        for value in ('opaque-private-value', secret, 'user:pass', 'opaque-secret', 'abcdef'):
            self.assertNotIn(value, result)
        self.assertNotIn(secret, self.readers.prompt({}))
    def test_registration_exposes_readers_only_and_vetoes_other_tools(self):
        ctx = FakeContext()
        self.plugin.register_readers(ctx, self.readers)
        self.assertEqual(set(ctx.tools), {'current_datetime','shared_memory_list','shared_memory_read','knowledge_list','knowledge_read','knowledge_search'})
        self.put(self.root / 'memories/MEMORY.md', 'live context')
        handler = ctx.tools['shared_memory_read'][1]
        self.assertEqual(json.loads(handler({'document':'MEMORY.md'}, task_id='native-session'))['content'], 'live context')
        for schema, _, group in ctx.tools.values():
            self.assertFalse(schema['parameters']['additionalProperties'])
            self.assertEqual(group, 'website_readonly')
        hook = ctx.hooks['pre_tool_call']
        for name in ('memory', 'session_search', 'write_file', 'terminal', 'tool_search',
                     'tool_describe', 'tool_call', 'arbitrary_mcp_reader'):
            self.assertEqual(hook(tool_name=name, args={})['action'], 'block')
        self.assertIsNone(hook(tool_name='web_search', args={'query':'public'}))
        self.assertIsNone(hook(tool_name='current_datetime', args={}))
        self.assertIsNone(hook(tool_name='shared_memory_read', args={'document':'MEMORY.md'}))
        self.assertIn('live context', next(iter(ctx.sections.values()))[0]({}))

    def test_registration_is_limited_to_two_public_profiles(self):
        root_module = type(sys)('hermes_constants')
        root_module.get_default_hermes_root = lambda: self.root
        root_module.get_hermes_home = lambda: self.root / 'profiles/unused'
        safety_module = type(sys)('agent.file_safety')
        safety_module.get_read_block_error = lambda path: None
        redact_module = type(sys)('agent.redact')
        redact_module.redact_sensitive_text = lambda text, **kwargs: text
        time_module = type(sys)('hermes_time')
        time_module.now = lambda: datetime(2026, 9, 13, tzinfo=timezone.utc)
        modules = {
            'hermes_constants': root_module,
            'agent.file_safety': safety_module,
            'agent.redact': redact_module,
            'hermes_time': time_module,
        }
        with mock.patch.dict(sys.modules, modules):
            for profile in ('website-chat', 'wechat-public'):
                ctx = FakeContext(profile)
                self.plugin.register(ctx)
                self.assertIn('current_datetime', ctx.tools)
            for profile in ('default', 'xue-owner', 'custom'):
                with self.assertRaisesRegex(RuntimeError, 'public read-only profile'):
                    self.plugin.register(FakeContext(profile))


if __name__ == '__main__':
    unittest.main()
