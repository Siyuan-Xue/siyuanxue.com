import hashlib
import importlib.util
import io
import pathlib
import tempfile
import unittest
import zipfile
import json
import os
import urllib.error
import threading
from contextlib import redirect_stdout
from unittest.mock import MagicMock, patch


spec = importlib.util.spec_from_file_location("upload_release", pathlib.Path(__file__).resolve().parents[1] / "ops/upload-release.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class Response(io.BytesIO):
    status = 200

    def __init__(self, body, status=200, headers=None):
        super().__init__(body)
        self.status = status
        self.headers = headers or {}

    def geturl(self):
        return "https://example.blob.core.windows.net/verified-artifact"


class ReleaseTransferTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.incoming = self.root / "incoming"
        self.incoming.mkdir()
        self.archive = "site-" + "a" * 40 + "-123-1.tar.gz"
        self.data = b"verified static archive"
        self.checksum = hashlib.sha256(self.data).hexdigest()
        self.checksum_text = f"{self.checksum}  {self.archive}\n".encode()
        self.payload = {"root": str(self.root), "archive": self.archive, "checksum": self.checksum,
                        "archive_size": len(self.data), "checksum_size": len(self.checksum_text),
                        "url": "https://example.blob.core.windows.net/verified-artifact"}

    def fixture(self, data=None, extra=None):
        stream = io.BytesIO()
        with zipfile.ZipFile(stream, "w") as archive:
            archive.writestr(self.archive, self.data if data is None else data)
            archive.writestr(self.archive + ".sha256", self.checksum_text)
            if extra:
                archive.writestr(extra, b"unrelated file")
        body = stream.getvalue()
        payload = {**self.payload, "zip_size": len(body), "zip_digest": hashlib.sha256(body).hexdigest()}
        return body, payload

    def test_fetches_exact_verified_archive_and_preserves_unrelated_incoming(self):
        unrelated = self.incoming / "earlier-backup.tar.gz"
        unrelated.write_bytes(b"keep this")
        body, payload = self.fixture()
        with patch("urllib.request.urlopen", return_value=Response(body)):
            try:
                module.fetch_release(payload)
            except ValueError as error:
                self.fail(f"valid verified artifact was rejected: {error}")
        self.assertEqual((self.incoming / self.archive).read_bytes(), self.data)
        self.assertEqual((self.incoming / (self.archive + ".sha256")).read_bytes(), self.checksum_text)
        self.assertEqual(unrelated.read_bytes(), b"keep this")
        self.assertEqual(len(list(self.incoming.iterdir())), 3)

    def test_archive_checksum_failure_does_not_replace_an_existing_file(self):
        target = self.incoming / self.archive
        target.write_bytes(b"previous incoming archive")
        body, payload = self.fixture(data=self.data.replace(b"verified", b"tampered"))
        with patch("urllib.request.urlopen", return_value=Response(body)):
            with self.assertRaises(ValueError):
                module.fetch_release(payload)
        self.assertEqual(target.read_bytes(), b"previous incoming archive")
        self.assertEqual(list(self.incoming.iterdir()), [target])

    def test_rejects_extra_zip_entries_without_extracting_any_files(self):
        body, payload = self.fixture(extra="../escaped")
        with patch("urllib.request.urlopen", return_value=Response(body)):
            with self.assertRaises(ValueError):
                module.fetch_release(payload)
        self.assertEqual(list(self.incoming.iterdir()), [])
        self.assertFalse((self.root / "escaped").exists())

    def test_rejects_a_zip_digest_mismatch_before_extracting(self):
        body, payload = self.fixture()
        payload["zip_digest"] = "0" * 64
        with patch("urllib.request.urlopen", return_value=Response(body)):
            with self.assertRaises(ValueError):
                module.fetch_release(payload)
        self.assertEqual(list(self.incoming.iterdir()), [])

    def ranged_fixture(self):
        self.data = bytes(range(256)) * 12288
        self.checksum = hashlib.sha256(self.data).hexdigest()
        self.checksum_text = f"{self.checksum}  {self.archive}\n".encode()
        self.payload.update(checksum=self.checksum, archive_size=len(self.data), checksum_size=len(self.checksum_text))
        return self.fixture()

    def test_large_artifact_downloads_concurrent_ranges_and_reassembles_exact_bytes(self):
        body, payload = self.ranged_fixture()
        lock, concurrent = threading.Lock(), threading.Event()
        active, maximum = 0, 0

        def storage(request, timeout):
            nonlocal active, maximum
            if not isinstance(request, urllib.request.Request) or not request.get_header("Range"):
                raise ValueError("storage requires bounded range requests")
            start, end = map(int, request.get_header("Range")[6:].split("-"))
            with lock:
                active += 1
                maximum = max(maximum, active)
                if active >= 2:
                    concurrent.set()
            if not concurrent.wait(2):
                raise ValueError("range requests were serialized")
            with lock:
                active -= 1
            return Response(body[start:end + 1], 206, {"Content-Range": f"bytes {start}-{end}/{len(body)}"})

        with patch("urllib.request.urlopen", side_effect=storage):
            try:
                module.fetch_release(payload)
            except ValueError as error:
                self.fail(f"valid concurrent range download was rejected: {error}")
        self.assertGreaterEqual(maximum, 2)
        self.assertEqual((self.incoming / self.archive).read_bytes(), self.data)
        self.assertEqual((self.incoming / (self.archive + ".sha256")).read_bytes(), self.checksum_text)

    def test_incorrect_content_range_does_not_replace_an_existing_archive(self):
        body, payload = self.ranged_fixture()
        target = self.incoming / self.archive
        target.write_bytes(b"previous archive")

        def storage(request, timeout):
            if not isinstance(request, urllib.request.Request):
                return Response(body)
            return Response(body, 206, {"Content-Range": f"bytes 0-{len(body)-1}/{len(body)}"})

        with patch("urllib.request.urlopen", side_effect=storage):
            with self.assertRaises(ValueError):
                module.fetch_release(payload)
        self.assertEqual(target.read_bytes(), b"previous archive")
        self.assertEqual(list(self.incoming.iterdir()), [target])

    def test_truncated_range_is_rejected_and_only_its_staging_is_removed(self):
        body, payload = self.ranged_fixture()

        def storage(request, timeout):
            if not isinstance(request, urllib.request.Request):
                return Response(body)
            start, end = map(int, request.get_header("Range")[6:].split("-"))
            return Response(body[start:end], 206, {"Content-Range": f"bytes {start}-{end}/{len(body)}"})

        with patch("urllib.request.urlopen", side_effect=storage):
            with self.assertRaises(ValueError):
                module.fetch_release(payload)
        self.assertEqual(list(self.incoming.iterdir()), [])

    def invoke_runner(self, artifact_sha="a" * 40):
        body, payload = self.fixture()
        archive = self.root / self.archive
        archive.write_bytes(self.data)
        pathlib.Path(str(archive) + ".sha256").write_bytes(self.checksum_text)
        metadata = {"artifacts": [{"id": 1, "name": "site-" + "a" * 40, "expired": False,
                     "workflow_run": {"head_sha": artifact_sha}, "digest": "sha256:" + payload["zip_digest"],
                     "size_in_bytes": len(body)}]}
        opener = MagicMock()
        opener.open.side_effect = [Response(json.dumps(metadata).encode()),
                                  urllib.error.HTTPError("https://api.github.com/artifact", 302, "Found", {"Location": payload["url"]}, None)]
        environment = {"GITHUB_TOKEN": "test-only-github-credential", "GITHUB_REPOSITORY": "owner/site",
                       "GITHUB_RUN_ID": "123", "GITHUB_SHA": "a" * 40, "ARCHIVE_NAME": str(archive),
                       "RUNNER_TEMP": str(self.root), "DEPLOY_ROOT": str(self.root), "DEPLOY_USER": "deploy",
                       "DEPLOY_HOST": "example.com", "DEPLOY_PORT": "22"}
        with patch.dict(os.environ, environment), patch("urllib.request.build_opener", return_value=opener), \
             patch("subprocess.run") as ssh, redirect_stdout(io.StringIO()):
            module.main()
        return opener, ssh

    def test_runner_keeps_github_credential_out_of_ssh_command_and_stdin(self):
        opener, ssh = self.invoke_runner()
        self.assertEqual(opener.open.call_count, 2)
        for call in opener.open.call_args_list:
            self.assertTrue(call.args[0].full_url.startswith("https://api.github.com/"))
            self.assertEqual(call.args[0].get_header("Authorization"), "Bearer test-only-github-credential")
        self.assertNotIn("test-only-github-credential", str(ssh.call_args))
        self.assertIn("StrictHostKeyChecking=yes", ssh.call_args.args[0])
        self.assertNotIn(self.payload["url"], str(ssh.call_args.args))
        self.assertIn(self.payload["url"], ssh.call_args.kwargs["input"])
        compile(ssh.call_args.kwargs["input"], "remote-release-fetch", "exec")

    def test_runner_rejects_an_artifact_from_another_commit(self):
        with self.assertRaisesRegex(ValueError, "matching verified artifact"):
            self.invoke_runner(artifact_sha="b" * 40)


if __name__ == "__main__":
    unittest.main()
