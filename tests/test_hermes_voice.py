"""Pure event tests for the native, non-authorizing voice provenance hook."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import unittest

path = Path(__file__).resolve().parents[1] / 'services/hermes-chat/voice-context/__init__.py'
spec = importlib.util.spec_from_file_location('voice_context', path)
voice = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice)


def event(kind='voice', text='', platform='weixin', media_types=()):
    return SimpleNamespace(message_type=SimpleNamespace(value=kind), text=text,
                           source=SimpleNamespace(platform=SimpleNamespace(value=platform)),
                           media_types=list(media_types), media_urls=['/cache/clip.silk'])


class VoiceTests(unittest.TestCase):
    def test_voice_annotation_preserves_caption_and_original_event(self):
        incoming = event(text='Please explain this part')
        result = voice.annotate_voice(incoming)
        self.assertEqual(result['action'], 'rewrite')
        self.assertIn('自动转写', result['text'])
        self.assertTrue(result['text'].endswith('Please explain this part'))
        self.assertEqual(incoming.text, 'Please explain this part')
        self.assertEqual(incoming.media_urls, ['/cache/clip.silk'])
        self.assertEqual(set(result), {'action', 'text'})

    def test_audio_attachment_is_annotated_but_ordinary_text_is_untouched(self):
        self.assertIsNotNone(voice.annotate_voice(event(kind='document', media_types=['audio/wav'])))
        self.assertIsNone(voice.annotate_voice(event(kind='text', text='I said voice')))
        self.assertIsNone(voice.annotate_voice(event(kind='photo', media_types=['image/jpeg'])))

    def test_other_platforms_and_reprocessing_are_untouched(self):
        self.assertIsNone(voice.annotate_voice(event(platform='telegram')))
        result = voice.annotate_voice(event())
        self.assertIsNone(voice.annotate_voice(event(text=result['text'])))


if __name__ == '__main__':
    unittest.main()
