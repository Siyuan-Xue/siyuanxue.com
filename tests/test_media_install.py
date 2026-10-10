import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('media_install', Path(__file__).resolve().parents[1] / 'ops/install-media.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class MediaInstallTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.destination = self.root / 'shared/media'
        self.bytes = b'image-fixture'
        self.digest = hashlib.sha256(self.bytes).hexdigest()
        self.file = {'src': f'/media/{self.digest}.png', 'sha256': self.digest, 'bytes': len(self.bytes), 'format': 'png', 'width': 10, 'height': 20}
        self.record = {'sample': dict(self.file, kind='image', variants=[self.file], cover=self.file)}
        (self.source / f'{self.digest}.png').write_bytes(self.bytes)

    def tearDown(self):
        self.temp.cleanup()

    def test_verified_install_is_idempotent_and_does_not_touch_other_assets(self):
        self.destination.mkdir(parents=True)
        retained = self.destination / 'retained.png'
        retained.write_bytes(b'old-release')
        module.install(self.record, self.source, self.destination)
        module.install(self.record, self.source, self.destination)
        self.assertEqual((self.destination / f'{self.digest}.png').read_bytes(), self.bytes)
        self.assertEqual(retained.read_bytes(), b'old-release')

    def test_bad_bytes_or_missing_file_never_install(self):
        (self.source / f'{self.digest}.png').write_bytes(b'corrupted')
        with self.assertRaises(ValueError): module.install(self.record, self.source, self.destination)
        self.assertFalse(self.destination.exists())

    def test_traversal_size_and_hash_path_mismatch_are_rejected(self):
        for changes in [{'src': '/media/../private.png'}, {'bytes': 0}, {'src': f'/media/{"a" * 64}.png'}]:
            file = dict(self.file, **changes)
            record = {'sample': dict(file, kind='image', variants=[file], cover=file)}
            with self.assertRaises(ValueError): module.install(record, self.source, self.destination)

    def test_source_symlink_and_existing_collision_are_rejected(self):
        target = self.source / f'{self.digest}.png'
        target.unlink()
        outside = self.root / 'outside.png'
        outside.write_bytes(self.bytes)
        target.symlink_to(outside)
        with self.assertRaises(ValueError): module.install(self.record, self.source, self.destination)
        target.unlink()
        target.write_bytes(self.bytes)
        self.destination.mkdir(parents=True)
        existing = self.destination / target.name
        existing.write_bytes(b'different')
        with self.assertRaises(ValueError): module.install(self.record, self.source, self.destination)
        self.assertEqual(existing.read_bytes(), b'different')

    def test_video_install_preserves_original_for_http_range_serving(self):
        file = dict(self.file, src=f'/media/{self.digest}.mp4', format='mp4')
        (self.source / f'{self.digest}.mp4').write_bytes(self.bytes)
        module.install({'sample': dict(file, kind='video')}, self.source, self.destination)
        self.assertEqual((self.destination / f'{self.digest}.mp4').read_bytes(), self.bytes)

    def test_snapshot_verifies_existing_backup_and_never_accepts_an_incomplete_snapshot(self):
        module.install(self.record, self.source, self.destination)
        backup = self.root / 'backups/snapshot'
        module.snapshot(self.record, self.destination, backup)
        module.snapshot(self.record, self.destination, backup)
        self.assertEqual((backup / 'media' / f'{self.digest}.png').read_bytes(), self.bytes)
        (backup / 'media' / f'{self.digest}.png').unlink()
        with self.assertRaises(ValueError): module.snapshot(self.record, self.destination, backup)

if __name__ == '__main__': unittest.main()
