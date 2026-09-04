#!/usr/bin/env bash
# Unit-test the CloudFront policy transform used by sync-playlang-csp.sh
# (incomplete XSSProtection/FrameOptions stubs must be dropped; CORP injected).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CSP="default-src 'self'"
CORP="cross-origin"

fixture='{
  "Name": "PlaylangWebSecurity",
  "SecurityHeadersConfig": {
    "ContentSecurityPolicy": {
      "Override": true,
      "ContentSecurityPolicy": "old-csp"
    },
    "ContentTypeOptions": { "Override": true },
    "StrictTransportSecurity": {
      "Override": true,
      "AccessControlMaxAgeSec": 31536000
    },
    "ReferrerPolicy": {
      "Override": true,
      "ReferrerPolicy": "no-referrer"
    },
    "XSSProtection": {},
    "FrameOptions": {}
  },
  "CustomHeadersConfig": {
    "Quantity": 2,
    "Items": [
      {
        "Header": "Cross-Origin-Embedder-Policy",
        "Value": "credentialless",
        "Override": true
      },
      {
        "Header": "Cross-Origin-Opener-Policy",
        "Value": "same-origin",
        "Override": true
      }
    ]
  }
}'

updated="$(
  jq --arg csp "$CSP" --arg corp "$CORP" -f "$ROOT/scripts/sync-playlang-csp.jq" <<<"$fixture"
)"

echo "$updated" | jq -e '
  .SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy == "default-src '\''self'\''"
  and (.SecurityHeadersConfig | has("XSSProtection") | not)
  and (.SecurityHeadersConfig | has("FrameOptions") | not)
  and (.CustomHeadersConfig.Quantity == 3)
  and ([.CustomHeadersConfig.Items[] | select(.Header == "Cross-Origin-Resource-Policy").Value] == ["cross-origin"])
' >/dev/null

echo "sync-playlang-csp transform ok"
