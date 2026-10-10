#!/usr/bin/env bash
# Native SSH authentication; passwords and keys are never copied into this workflow.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
host=${1:-ubuntu@82.156.77.131}
source=${2:-media-local}
manifest=${3:-src/data/media.json}
[[ $host =~ ^[a-z_][a-z0-9_-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { printf 'Invalid SSH destination\n' >&2; exit 1; }
# macOS TMPDIR can exceed OpenSSH's Unix socket limit, including its listener suffix.
session=$(mktemp -d /tmp/siyuan-media.XXXXXX)
chmod 700 "$session"
control=${MEDIA_SSH_CONTROL:-$session/s}
own_control=false
cleanup() {
 if [[ $own_control == true ]]; then ssh -S "$control" -O exit "$host" >/dev/null 2>&1 || true; fi
 rm -rf -- "$session"
}
trap cleanup EXIT
python3 - "$manifest" "$session/manifest.json" "${@:4}" <<'PY'
import json, sys
from pathlib import Path
records = json.loads(Path(sys.argv[1]).read_text())
identifiers = sys.argv[3:]
if identifiers:
    if any(identifier not in records for identifier in identifiers):
        raise ValueError('Unknown media ID requested for upload')
    records = {identifier: records[identifier] for identifier in identifiers}
Path(sys.argv[2]).write_text(json.dumps(records, indent=2) + '\n')
PY
manifest="$session/manifest.json"
python3 ops/install-media.py "$manifest" "$source" --list > "$session/files"
digest=$(python3 -c 'import hashlib,sys; print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$manifest")
stage=".cache/siyuan-media/$digest"
if [[ -z ${MEDIA_SSH_CONTROL:-} ]]; then
 own_control=true
 ssh -o StrictHostKeyChecking=yes -o ControlMaster=auto -o ControlPersist=600 -o ControlPath="$control" -o ConnectTimeout=15 "$host" true
fi
connection=(ssh -S "$control" -o StrictHostKeyChecking=yes -o BatchMode=yes -o ConnectTimeout=15)
"${connection[@]}" "$host" "umask 077; mkdir -p '$stage/media'"
# The deterministic staging directory and --partial allow a later invocation to resume.
rsync -rt --partial --stats --files-from="$session/files" -e "ssh -S $control -o StrictHostKeyChecking=yes -o BatchMode=yes" "$source/" "$host:$stage/media/"
cp ops/install-media.py "$session/install-media.py"
rsync -rt -e "ssh -S $control -o StrictHostKeyChecking=yes -o BatchMode=yes" "$session/manifest.json" "$session/install-media.py" "$host:$stage/"
"${connection[@]}" "$host" "set -eu; sudo -n python3 '$stage/install-media.py' '$stage/manifest.json' '$stage/media' --snapshot '/var/backups/siyuanxue-media/$digest'"
printf 'Direct upload verified. Staging retained for resumable checks; media snapshot: %s\n' "$digest"
