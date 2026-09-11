#!/usr/bin/env bash
set -Eeuo pipefail
[[ $# -eq 1 && "$1" =~ ^[0-9a-f]{40}$ ]] || { echo 'usage: verify-public.sh COMMIT_SHA' >&2; exit 2; }
sha=$1
for domain in siyuanxue.com xuesiyuan.com; do
    body=$(curl --fail --silent --show-error --max-time 15 "https://$domain/__health")
    [[ "$body" == "$sha" ]] || { echo "$domain has an unexpected release" >&2; exit 1; }
    if [[ "$domain" == siyuanxue.com ]]; then locale=en; else locale=zh-CN; fi
    curl --fail --silent --show-error --max-time 15 "https://$domain/" | python3 -c 'import sys; from html.parser import HTMLParser
class Check(HTMLParser):
 def handle_starttag(self, tag, attrs):
  if tag == "html": self.locale = dict(attrs).get("lang")
parser=Check(); parser.feed(sys.stdin.read()); sys.exit(0 if getattr(parser,"locale",None) == sys.argv[1] else 1)' "$locale"
    code=$(curl --silent --show-error --max-time 15 -o /dev/null -w '%{http_code}' "https://$domain/images/p-202.jpg")
    [[ "$code" == 410 ]] || { echo "$domain still exposes the removed image route" >&2; exit 1; }
done
printf 'Both public locales serve release %s\n' "$sha"
