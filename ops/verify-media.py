#!/usr/bin/env python3
"""Check the same external media on both fixed-language production domains."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import importlib.util
import json
from pathlib import Path
import urllib.request

spec = importlib.util.spec_from_file_location('media_install', Path(__file__).with_name('install-media.py'))
media_install = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media_install)
MIME = {'png': 'image/png', 'jpeg': 'image/jpeg', 'webp': 'image/webp', 'avif': 'image/avif', 'gif': 'image/gif', 'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime'}

def verify_response(response, expected, extension, headers_only):
    digest, size = expected
    cache = ', '.join(response.headers.get_all('Cache-Control', []))
    if response.status != 200 or int(response.headers['Content-Length']) != size or response.headers.get_content_type() != MIME[extension] or 'immutable' not in cache:
        raise ValueError('Media headers failed')
    if not headers_only and hashlib.file_digest(response, 'sha256').hexdigest() != digest:
        raise ValueError('Media checksum failed')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, default=Path('src/data/media.json'))
    parser.add_argument('--headers-only', action='store_true')
    args = parser.parse_args()
    files = media_install.files_from_manifest(json.loads(args.manifest.read_text()))
    jobs = [(domain, filename, expected) for domain in ('siyuanxue.com', 'xuesiyuan.com') for filename, expected in files.items()]
    def check(job):
        domain, filename, expected = job
        request = urllib.request.Request(f'https://{domain}/media/{filename}', method='HEAD' if args.headers_only else 'GET')
        with urllib.request.urlopen(request, timeout=30) as response:
            try: verify_response(response, expected, filename.rsplit('.', 1)[1], args.headers_only)
            except ValueError as error: raise ValueError(f'{error}: {domain}/{filename}') from error
    with ThreadPoolExecutor(max_workers=8) as pool: list(pool.map(check, jobs))
    print(f'Verified {len(files)} media files on both domains ({"headers" if args.headers_only else "SHA-256 and headers"})')

if __name__ == '__main__': main()
