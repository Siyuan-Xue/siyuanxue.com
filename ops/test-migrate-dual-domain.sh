#!/usr/bin/env bash
# Filesystem/command-contract test. Real Nginx behavior is covered separately.
set -Eeuo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
TEST=$(mktemp -d)
trap 'rm -rf "$TEST"' EXIT
export MIGRATION_FIXTURE="$TEST/root"
mkdir -p "$TEST/bin" "$TEST/source/ops/nginx" "$MIGRATION_FIXTURE/etc/nginx/sites-available" "$MIGRATION_FIXTURE/etc/nginx/sites-enabled" \
 "$MIGRATION_FIXTURE/usr/local/bin" "$MIGRATION_FIXTURE/usr/local/sbin" "$MIGRATION_FIXTURE/usr/local/lib/siyuanxue-https/nginx" \
 "$MIGRATION_FIXTURE/etc/sudoers.d" "$MIGRATION_FIXTURE/etc/letsencrypt/renewal" "$MIGRATION_FIXTURE/var/backups"
old=$(printf '%040d' 1); new=$(printf '%040d' 2)
site="$MIGRATION_FIXTURE/var/www/siyuanxue.com"
mkdir -p "$site/releases/$old/_astro" "$site/releases/$new/zh"
printf '%s' "$old" > "$site/releases/$old/__health"
printf 'old asset' > "$site/releases/$old/_astro/old.css"
printf old > "$site/releases/$old/index.html"
ln -s "releases/$old" "$site/current"
ln -s "releases/$old" "$site/previous"
for name in siyuanxue siyuanxue-xuesiyuan-com siyuanxue-xuesiyuan-com-cn; do
 printf 'original %s\n' "$name" > "$MIGRATION_FIXTURE/etc/nginx/sites-available/$name"
 ln -s "$MIGRATION_FIXTURE/etc/nginx/sites-available/$name" "$MIGRATION_FIXTURE/etc/nginx/sites-enabled/$name"
done
printf retained > "$MIGRATION_FIXTURE/etc/letsencrypt/renewal/xuesiyuan.com.cn.conf"
printf old > "$MIGRATION_FIXTURE/usr/local/bin/siyuanxue-release"
cp "$SCRIPT_DIR/release.sh" "$SCRIPT_DIR/enable-https.sh" "$TEST/source/ops/"
cp "$SCRIPT_DIR/nginx/"{siyuanxue.com,xuesiyuan.com}.conf "$TEST/source/ops/nginx/"
python3 - "$SCRIPT_DIR/migrate-dual-domain.sh" "$TEST/source/ops/migrate-dual-domain.sh" "$MIGRATION_FIXTURE" <<'PY'
import pathlib, sys
source, output, root = sys.argv[1:]
s = pathlib.Path(source).read_text().replace('[[ $EUID -eq 0 ]]', 'true')
if sys.platform == 'darwin': s = s.replace('mv -Tf', 'mv -fh')
for prefix in ['/var/', '/etc/', '/usr/local/']:
    s = s.replace(prefix, root + prefix)
pathlib.Path(output).write_text(s)
PY
cat > "$TEST/bin/sudo" <<'SH'
#!/usr/bin/env bash
shift 2
exec "$@"
SH
cat > "$TEST/bin/nginx" <<'SH'
#!/usr/bin/env bash
if [[ -f "$MIGRATION_FIXTURE/fail-nginx" ]]; then rm "$MIGRATION_FIXTURE/fail-nginx"; exit 1; fi
SH
cat > "$TEST/bin/curl" <<'SH'
#!/usr/bin/env bash
cat "$MIGRATION_FIXTURE/var/www/siyuanxue.com/current/__health"
SH
for command in systemctl visudo; do printf '#!/usr/bin/env bash\nexit 0\n' > "$TEST/bin/$command"; done
chmod +x "$TEST/bin/"*
export PATH="$TEST/bin:$PATH"
bash "$TEST/source/ops/migrate-dual-domain.sh" prepare "$TEST/source" "$new"
helper="$MIGRATION_FIXTURE/usr/local/sbin/siyuanxue-domain-migration"
state="$MIGRATION_FIXTURE/var/backups/siyuanxue-dual-domain-20260911"
[[ -f "$site/shared/_astro/old.css" && -f "$state/original-release/index.html" ]]
if bash "$helper" apply; then echo 'migration accepted wrong current SHA' >&2; exit 1; fi
printf en > "$site/releases/$new/index.html"
printf zh > "$site/releases/$new/zh/index.html"
printf '%s' "$new" > "$site/releases/$new/__health"
printf '%s' "$new" > "$site/releases/$new/zh/__health"
printf '{"version":2,"sha":"%s","locales":{"en":".","zh":"zh"}}' "$new" > "$site/releases/$new/release.json"
ln -sfn "releases/$new" "$site/current"
touch "$MIGRATION_FIXTURE/fail-nginx"
if bash "$helper" apply; then echo 'migration ignored nginx failure' >&2; exit 1; fi
[[ $(readlink "$site/current") == "releases/$old" ]]
[[ -L "$MIGRATION_FIXTURE/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com-cn" ]]
ln -sfn "releases/$new" "$site/current"
bash "$helper" apply
[[ ! -L "$MIGRATION_FIXTURE/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com-cn" ]]
bash "$helper" restore
[[ $(readlink "$site/current") == "releases/$old" ]]
ln -sfn "releases/$new" "$site/current"
bash "$helper" apply
bash "$helper" finish
[[ $(readlink "$site/previous") == "releases/$new" ]]
[[ -f "$state/retired-renewal.conf" && ! -e "$MIGRATION_FIXTURE/etc/sudoers.d/siyuanxue-domain-migration" ]]
if bash "$helper" restore; then echo 'finished migration accepted legacy recovery' >&2; exit 1; fi
printf 'one-time migration contract tests passed\n'
