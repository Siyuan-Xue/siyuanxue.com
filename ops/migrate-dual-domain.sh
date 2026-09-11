#!/usr/bin/env bash
# One-time, root-owned bridge for the 2026-09-11 domain migration.
# CI receives sudo permission for these three exact, argument-free operations only.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'migration requires root' >&2; exit 1; }
readonly SITE=/var/www/siyuanxue.com
readonly STATE=/var/backups/siyuanxue-dual-domain-20260911
readonly CONFIG=/usr/local/lib/siyuanxue-dual-domain
readonly HELPER=/usr/local/sbin/siyuanxue-domain-migration
readonly GRANT=/etc/sudoers.d/siyuanxue-domain-migration
readonly EN=/etc/nginx/sites-available/siyuanxue
readonly ZH=/etc/nginx/sites-available/siyuanxue-xuesiyuan-com
readonly RETIRED=/etc/nginx/sites-enabled/siyuanxue-xuesiyuan-com-cn
readonly RENEWAL=/etc/letsencrypt/renewal/xuesiyuan.com.cn.conf

link_release() {
    [[ $1 =~ ^releases/[0-9a-f]{40}$ ]] || return 1
    ln -s "$1" "$SITE/$2.migration"
    mv -Tf "$SITE/$2.migration" "$SITE/$2"
}

restore() {
    [[ -f "$STATE/prepared" && ! -f "$STATE/finished" ]] || return 1
    install -m 0644 "$STATE/baseline-en.conf" "$EN"
    install -m 0644 "$STATE/original-zh.conf" "$ZH"
    ln -sfn /etc/nginx/sites-available/siyuanxue-xuesiyuan-com-cn "$RETIRED"
    nginx -t
    # Restore routing before returning to the legacy content layout.
    systemctl reload nginx
    link_release "$(cat "$STATE/original-current")" current
    link_release "$(cat "$STATE/original-previous")" previous
    [[ $(curl -fsS --max-time 10 http://127.0.0.1/__health) == "$(basename "$(cat "$STATE/original-current")")" ]] || return 1
    printf 'Restored photo-safe baseline\n'
}

prepare() {
    [[ $# -eq 2 && $2 =~ ^[0-9a-f]{40}$ ]] || return 1
    local source=$1 sha=$2
    [[ ! -e "$STATE" && -f "$source/ops/release.sh" ]] || return 1
    [[ -L "$RETIRED" && -f "$ZH" && -f "$EN" ]] || return 1
    [[ $(readlink "$SITE/current") =~ ^releases/[0-9a-f]{40}$ ]] || return 1
    [[ $(readlink "$SITE/previous") =~ ^releases/[0-9a-f]{40}$ ]] || return 1
    nginx -t
    install -d -m 0700 "$STATE" "$CONFIG"
    cp -p "$EN" "$STATE/original-en.conf"
    cp -p "$ZH" "$STATE/original-zh.conf"
    cp -p /etc/nginx/sites-available/siyuanxue-xuesiyuan-com-cn "$STATE/original-retired.conf"
    cp -p /usr/local/bin/siyuanxue-release "$STATE/original-release-helper"
    cp -a "$SITE/$(readlink "$SITE/current")" "$STATE/original-release"
    cp -a /usr/local/lib/siyuanxue-https "$STATE/original-https-tools"
    readlink "$SITE/current" > "$STATE/original-current"
    readlink "$SITE/previous" > "$STATE/original-previous"
    printf '%s\n' "$sha" > "$STATE/expected-sha"
    install -m 0755 "$source/ops/release.sh" /usr/local/bin/siyuanxue-release
    install -m 0755 "$source/ops/migrate-dual-domain.sh" "$HELPER"
    install -m 0644 "$source/ops/nginx/siyuanxue.com.conf" "$CONFIG/en.conf"
    install -m 0644 "$source/ops/nginx/xuesiyuan.com.conf" "$CONFIG/zh.conf"
    install -m 0755 "$source/ops/enable-https.sh" /usr/local/lib/siyuanxue-https/enable-https.sh
    install -m 0644 "$CONFIG/en.conf" /usr/local/lib/siyuanxue-https/nginx/siyuanxue.com.conf
    install -m 0644 "$CONFIG/zh.conf" /usr/local/lib/siyuanxue-https/nginx/xuesiyuan.com.conf
    sudo -u deploy /usr/local/bin/siyuanxue-release assets "$SITE"
    # This configuration works with the old release and permanently denies the old photo.
    install -m 0644 "$CONFIG/en.conf" "$EN"
    if ! nginx -t; then
        install -m 0644 "$STATE/original-en.conf" "$EN"
        return 1
    fi
    systemctl reload nginx
    install -m 0644 "$EN" "$STATE/baseline-en.conf"
    touch "$STATE/prepared"
    printf 'deploy ALL=(root) NOPASSWD: %s apply, %s restore, %s finish\n' "$HELPER" "$HELPER" "$HELPER" > "$STATE/sudoers"
    visudo -cf "$STATE/sudoers"
    install -m 0440 "$STATE/sudoers" "$GRANT"
    printf 'Prepared GitHub cutover for %s; backup %s\n' "$sha" "$STATE"
}

apply() {
    [[ -f "$STATE/prepared" && ! -f "$STATE/finished" ]] || return 1
    local sha
    sha=$(cat "$STATE/expected-sha")
    [[ $(readlink "$SITE/current") == "releases/$sha" ]] || return 1
    /usr/local/bin/siyuanxue-release check "$SITE" "$sha"
    install -m 0644 "$CONFIG/zh.conf" "$ZH"
    rm -f "$RETIRED"
    if ! nginx -t || ! systemctl reload nginx; then
        restore
        return 1
    fi
    printf 'Chinese domain activated for %s\n' "$sha"
}

finish() {
    [[ -f "$STATE/prepared" && ! -f "$STATE/finished" ]] || return 1
    local sha
    sha=$(cat "$STATE/expected-sha")
    [[ $(readlink "$SITE/current") == "releases/$sha" ]] || return 1
    /usr/local/bin/siyuanxue-release check "$SITE" "$sha"
    cmp "$CONFIG/zh.conf" "$ZH"
    [[ ! -e "$RETIRED" && ! -L "$RETIRED" ]] || return 1
    if [[ -f "$RENEWAL" ]]; then mv "$RENEWAL" "$STATE/retired-renewal.conf"; fi
    rm -f /usr/local/lib/siyuanxue-https/nginx/xuesiyuan.com.cn.conf
    # There is no earlier bilingual release yet; keep the first release as daily recovery.
    link_release "releases/$sha" previous
    touch "$STATE/finished"
    rm -f "$GRANT"
    printf 'Migration completed; temporary CI privilege removed\n'
}

case ${1:-} in
    prepare) [[ $# -eq 3 ]] || exit 2; shift; prepare "$@" ;;
    apply|restore|finish) [[ $# -eq 1 ]] || exit 2; "$1" ;;
    *) echo 'usage: migrate-dual-domain.sh prepare ROOT_OWNED_SOURCE SHA | apply | restore | finish' >&2; exit 2 ;;
esac
