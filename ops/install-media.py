#!/usr/bin/env python3
"""Validate and append content-addressed media; never replace or prune existing files."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile

FORMATS = {'png', 'jpeg', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov'}
VIDEO_FORMATS = {'mp4', 'webm', 'mov'}

def files_from_manifest(records):
    if not isinstance(records, dict) or not records:
        raise ValueError('Media manifest must contain records')
    files = {}
    for identifier, record in records.items():
        if not re.fullmatch(r'[a-z0-9]+(?:[-/][a-z0-9]+)*', identifier) or not isinstance(record, dict):
            raise ValueError('Invalid media ID or record')
        kind = record.get('kind')
        if kind not in {'image', 'video'}:
            raise ValueError('Invalid media kind')
        group = [record]
        if kind == 'image':
            if not isinstance(record.get('variants'), list) or not isinstance(record.get('cover'), dict):
                raise ValueError('Image requires variants and cover')
            group += record['variants'] + [record['cover']]
        for file in group:
            if not isinstance(file, dict): raise ValueError('Invalid file record')
            digest, extension, size = file.get('sha256'), file.get('format'), file.get('bytes')
            if not isinstance(digest, str) or not re.fullmatch(r'[a-f0-9]{64}', digest) or extension not in FORMATS or type(size) is not int or size <= 0:
                raise ValueError('Invalid media hash, format or size')
            filename = f'{digest}.{extension}'
            if file.get('src') != '/media/' + filename:
                raise ValueError('Media path must match hash and format')
            if (extension in VIDEO_FORMATS) != (kind == 'video'):
                raise ValueError('Invalid media kind/format')
            if kind == 'image' and any(type(file.get(d)) is not int or file[d] <= 0 for d in ('width', 'height')):
                raise ValueError('Image requires positive dimensions')
            expected = (digest, size)
            if filename in files and files[filename] != expected: raise ValueError('Conflicting file records')
            files[filename] = expected
    return files

def open_regular(path):
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    if not stat.S_ISREG(os.fstat(fd).st_mode):
        os.close(fd)
        raise ValueError('Media must be a regular file')
    return os.fdopen(fd, 'rb')

def verify(path, expected):
    digest, size = expected
    try:
        with open_regular(path) as stream:
            actual_size = os.fstat(stream.fileno()).st_size
            actual_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    except OSError as error:
        raise ValueError(f'Media unavailable: {path.name}') from error
    if actual_size != size or actual_hash != digest:
        raise ValueError(f'Media checksum/size mismatch: {path.name}')

def validate_sources(records, source):
    files = files_from_manifest(records)
    for filename, expected in files.items(): verify(source / filename, expected)
    return files

def install(records, source, destination):
    files = validate_sources(records, source)
    if destination.is_symlink(): raise ValueError('Destination must not be a symlink')
    # Check the entire batch before any writes, including retained-file collisions.
    for filename, expected in files.items():
        target = destination / filename
        if target.exists() or target.is_symlink(): verify(target, expected)
    destination.mkdir(parents=True, exist_ok=True, mode=0o755)
    for filename, expected in files.items():
        target = destination / filename
        if target.exists(): continue
        fd, name = tempfile.mkstemp(prefix='.media-', dir=destination)
        temporary = Path(name)
        try:
            with os.fdopen(fd, 'wb') as output, open_regular(source / filename) as input:
                shutil.copyfileobj(input, output, 1024 * 1024)
                output.flush()
                os.fsync(output.fileno())
            verify(temporary, expected)
            temporary.chmod(0o644)
            try: os.link(temporary, target)
            except FileExistsError: verify(target, expected)
        finally: temporary.unlink(missing_ok=True)
    return len(files)

def snapshot(records, media, backup):
    files = validate_sources(records, media)
    if backup.exists() or backup.is_symlink():
        if backup.is_symlink() or not backup.is_dir(): raise ValueError('Invalid snapshot directory')
        try:
            with open_regular(backup / 'manifest.json') as stream:
                if json.load(stream) != records: raise ValueError('Snapshot manifest mismatch')
        except OSError as error: raise ValueError('Snapshot manifest unavailable') from error
        validate_sources(records, backup / 'media')
        return
    backup.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = Path(tempfile.mkdtemp(prefix='.snapshot-', dir=backup.parent))
    try:
        (temporary / 'media').mkdir()
        for filename, expected in files.items():
            os.link(media / filename, temporary / 'media' / filename, follow_symlinks=False)
            verify(temporary / 'media' / filename, expected)
        (temporary / 'manifest.json').write_text(json.dumps(records, indent=2) + '\n')
        temporary.rename(backup)
    finally:
        if temporary.exists(): shutil.rmtree(temporary)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('source', type=Path)
    parser.add_argument('--destination', type=Path, default=Path('/var/www/siyuanxue.com/shared/media'))
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--snapshot', type=Path)
    args = parser.parse_args()
    records = json.loads(args.manifest.read_text())
    files = validate_sources(records, args.source)
    if args.list: print('\n'.join(sorted(files)))
    elif args.check: print(f'Validated {len(files)} media files')
    else:
        count = install(records, args.source, args.destination)
        if args.snapshot: snapshot(records, args.destination, args.snapshot)
        print(f'Installed/verified {count} media files')

if __name__ == '__main__': main()
