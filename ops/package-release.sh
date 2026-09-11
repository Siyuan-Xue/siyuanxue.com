#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# -eq 3 ]] || { echo 'usage: package-release.sh DIST_DIR SHA ARCHIVE_PATH' >&2; exit 2; }
dist=$1
sha=$2
archive=$3
[[ "$dist" == /* && "$dist" != / && "$archive" == /* && "$archive" == *.tar.gz ]] || exit 2
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
[[ -s "$dist/index.html" && -s "$dist/zh/index.html" ]] || { echo 'both locale homepages are required' >&2; exit 1; }
python3 - "$dist" "$sha" <<'PY'
import json, pathlib, sys
root, sha = pathlib.Path(sys.argv[1]), sys.argv[2]
for target in (root / '__health', root / 'zh' / '__health'):
    target.write_text(sha)
(root / 'release.json').write_text(json.dumps({'version': 2, 'sha': sha, 'locales': {'en': '.', 'zh': 'zh'}}) + '\n')
PY
COPYFILE_DISABLE=1 tar -czf "$archive" -C "$dist" .
if command -v sha256sum >/dev/null 2>&1; then
    checksum=$(sha256sum "$archive" | awk '{print $1}')
else
    checksum=$(shasum -a 256 "$archive" | awk '{print $1}')
fi
printf '%s  %s\n' "$checksum" "${archive##*/}" > "$archive.sha256"
