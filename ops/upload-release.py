#!/usr/bin/env python3
"""Transfer the verified Actions artifact without forwarding GitHub credentials."""


def fetch_release(payload):
    # This function is sent over strict SSH and runs with the existing deploy user.
    import hashlib
    import os
    import pathlib
    import re
    import shutil
    import stat
    import tempfile
    import time
    import urllib.parse
    import urllib.request
    import zipfile

    class TransferError(ValueError):
        pass

    archive_name = payload["archive"]
    if not re.fullmatch(r"site-[0-9a-f]{40}-[0-9]+-[0-9]+\.tar\.gz", archive_name):
        raise TransferError("invalid archive name")
    for key in ("checksum", "zip_digest"):
        if not re.fullmatch(r"[0-9a-f]{64}", payload[key]):
            raise TransferError("invalid checksum")
    url = urllib.parse.urlsplit(payload["url"])
    if url.scheme != "https" or url.username or url.password or not url.hostname or not (
        url.hostname.endswith(".blob.core.windows.net") or url.hostname.endswith(".actions.githubusercontent.com")
    ):
        raise TransferError("unexpected artifact storage host")
    incoming = pathlib.Path(payload["root"]) / "incoming"
    if incoming.is_symlink() or not incoming.is_dir():
        raise TransferError("invalid incoming directory")
    zip_size = payload["zip_size"]
    if not 0 < zip_size <= 1024 * 1024 * 1024:
        raise TransferError("invalid artifact size")
    if shutil.disk_usage(incoming).free < zip_size + payload["archive_size"] + 1024 * 1024:
        raise TransferError("insufficient incoming disk space")
    checksum_text = f'{payload["checksum"]}  {archive_name}\n'.encode()
    started = reported = time.monotonic()
    with tempfile.TemporaryDirectory(prefix=".artifact-", dir=incoming) as temporary:
        temporary = pathlib.Path(temporary)
        zipped = temporary / "artifact.zip"
        digest, received = hashlib.sha256(), 0
        print("Downloading verified Actions artifact over HTTPS", flush=True)
        # No GitHub bearer token is sent to the server or the artifact storage host.
        with urllib.request.urlopen(payload["url"], timeout=30) as response, zipped.open("wb") as output:
            if response.status != 200:
                raise TransferError("artifact download was not successful")
            while chunk := response.read(1024 * 1024):
                received += len(chunk)
                if received > zip_size or time.monotonic() - started > 600:
                    raise TransferError("artifact download exceeded its bound")
                output.write(chunk)
                digest.update(chunk)
                if time.monotonic() - reported >= 15:
                    print(f"Artifact download: {received} / {zip_size} bytes", flush=True)
                    reported = time.monotonic()
        if received != zip_size or digest.hexdigest() != payload["zip_digest"]:
            raise TransferError("artifact ZIP checksum or size mismatch")
        with zipfile.ZipFile(zipped) as source:
            entries = source.infolist()
            expected = {archive_name: payload["archive_size"], archive_name + ".sha256": payload["checksum_size"]}
            if len(entries) != 2 or {entry.filename for entry in entries} != set(expected):
                raise TransferError("unexpected artifact entries")
            for entry in entries:
                mode = entry.external_attr >> 16
                if entry.file_size != expected[entry.filename] or entry.is_dir() or stat.S_ISLNK(mode):
                    raise TransferError("unsafe artifact entry")
            if source.read(archive_name + ".sha256") != checksum_text:
                raise TransferError("artifact checksum file mismatch")
            archive = temporary / archive_name
            digest = hashlib.sha256()
            with source.open(archive_name) as compressed, archive.open("wb") as output:
                while chunk := compressed.read(1024 * 1024):
                    output.write(chunk)
                    digest.update(chunk)
            if digest.hexdigest() != payload["checksum"]:
                raise TransferError("release archive checksum mismatch")
        checksum_file = temporary / (archive_name + ".sha256")
        checksum_file.write_bytes(checksum_text)
        os.replace(archive, incoming / archive_name)
        os.replace(checksum_file, incoming / checksum_file.name)
    print(f"Verified release transferred: {payload['archive_size']} bytes", flush=True)


def main():
    import hashlib
    import inspect
    import json
    import os
    import pathlib
    import re
    import subprocess
    import urllib.error
    import urllib.request

    token = os.environ["GITHUB_TOKEN"]
    repository, run_id, sha = (os.environ[key] for key in ("GITHUB_REPOSITORY", "GITHUB_RUN_ID", "GITHUB_SHA"))
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repository) or not run_id.isdecimal() or not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("invalid Actions release identity")
    archive = pathlib.Path(os.environ["ARCHIVE_NAME"])
    checksum = hashlib.sha256(archive.read_bytes()).hexdigest()
    checksum_file = pathlib.Path(str(archive) + ".sha256")
    if checksum_file.read_bytes() != f"{checksum}  {archive.name}\n".encode():
        raise ValueError("local verified archive checksum mismatch")

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, response, code, message, headers, new_url):
            return None

    opener = urllib.request.build_opener(NoRedirect)

    def api(path):
        request = urllib.request.Request(f"https://api.github.com/repos/{repository}/{path}", headers={
            "Authorization": "Bearer " + token, "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "siyuanxue-release",
        })
        return opener.open(request, timeout=30)

    with api(f"actions/runs/{run_id}/artifacts?per_page=100") as response:
        artifacts = json.load(response)["artifacts"]
    selected = [item for item in artifacts if item["name"] == "site-" + sha and not item["expired"]]
    if len(selected) != 1 or selected[0]["workflow_run"]["head_sha"] != sha:
        raise ValueError("matching verified artifact not found")
    artifact = selected[0]
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", artifact.get("digest", "")):
        raise ValueError("verified artifact digest missing")
    try:
        api(f"actions/artifacts/{artifact['id']}/zip")
        raise ValueError("artifact download redirect missing")
    except urllib.error.HTTPError as error:
        if error.code != 302:
            raise
        signed_url = error.headers["Location"]
    # Treat the one-minute download URL as a secret; never put it in command args or logs.
    print("::add-mask::" + signed_url, flush=True)
    payload = {"root": os.environ["DEPLOY_ROOT"], "archive": archive.name, "checksum": checksum,
               "archive_size": archive.stat().st_size, "checksum_size": checksum_file.stat().st_size,
               "zip_size": artifact["size_in_bytes"], "zip_digest": artifact["digest"][7:], "url": signed_url}
    program = inspect.getsource(fetch_release) + "\nimport sys\ntry:\n    fetch_release(" + repr(payload) + ")\nexcept Exception as error:\n    reason = str(error) if type(error).__name__ == 'TransferError' else type(error).__name__\n    print('Artifact fetch failed: ' + reason, file=sys.stderr)\n    sys.exit(1)\n"
    ssh_directory = pathlib.Path(os.environ["RUNNER_TEMP"]) / "ssh"
    command = ["ssh", "-i", str(ssh_directory / "deploy_key"), "-p", os.environ["DEPLOY_PORT"],
               "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes", "-o", "StrictHostKeyChecking=yes",
               "-o", "UserKnownHostsFile=" + str(ssh_directory / "known_hosts"), "-o", "ConnectTimeout=15",
               "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3",
               os.environ["DEPLOY_USER"] + "@" + os.environ["DEPLOY_HOST"], "python3", "-"]
    subprocess.run(command, input=program, text=True, check=True, timeout=660)


if __name__ == "__main__":
    import sys
    try:
        main()
    except Exception as error:
        # urllib exceptions may contain signed URLs; report their type without their text.
        print("Artifact transfer failed: " + type(error).__name__, file=sys.stderr)
        sys.exit(1)
