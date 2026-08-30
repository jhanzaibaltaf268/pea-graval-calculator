#!/usr/bin/env bash
# Submits every URL in sitemap.xml to IndexNow (Bing, Yandex, Seznam.cz, Naver)
# so new/changed pages get discovered without waiting on a crawl.
# Run this after deploying, whenever sitemap.xml changes.
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="thegravelcalculators.com"
KEY="2d0d9695fa60a7471ff53f9efda7698f"
KEY_LOCATION="https://${HOST}/${KEY}.txt"

urls=$(grep -oP '(?<=<loc>)[^<]+' sitemap.xml)
url_list_json=$(printf '%s\n' "$urls" | jq -R . | jq -s .)

payload=$(jq -n \
  --arg host "$HOST" \
  --arg key "$KEY" \
  --arg keyLocation "$KEY_LOCATION" \
  --argjson urlList "$url_list_json" \
  '{host: $host, key: $key, keyLocation: $keyLocation, urlList: $urlList}')

curl -s -o /dev/stderr -w "\nHTTP %{http_code}\n" \
  -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$payload"
