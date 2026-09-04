#!/usr/bin/env bash
# Push canonical CSP + CORP from playlang-security.ts onto both CloudFront
# response header policies attached to PlaylangWebStack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CSP="$(
  pnpm --filter @playlang/infra-cdk exec tsx -e \
    "import { playlangContentSecurityPolicy } from './lib/playlang-security.ts'; process.stdout.write(playlangContentSecurityPolicy());"
)"
CORP="$(
  pnpm --filter @playlang/infra-cdk exec tsx -e \
    "import { PLAYLANG_CORP } from './lib/playlang-security.ts'; process.stdout.write(PLAYLANG_CORP);"
)"

mapfile -t POLICY_IDS < <(
  aws cloudformation describe-stack-resources \
    --stack-name PlaylangWebStack \
    --query "StackResources[?ResourceType=='AWS::CloudFront::ResponseHeadersPolicy'].PhysicalResourceId" \
    --output text | tr '\t' '\n'
)

if ((${#POLICY_IDS[@]} == 0)); then
  echo "No CloudFront response header policies found on PlaylangWebStack" >&2
  exit 1
fi

echo "Syncing CSP + CORP onto ${#POLICY_IDS[@]} response header policies"

# AWS get-response-headers-policy can return XSSProtection / FrameOptions stubs
# without Override (and sibling fields). update-response-headers-policy then
# rejects the config. Drop incomplete blocks; Playlang does not configure them.
transform_policy_config() {
  jq --arg csp "$CSP" --arg corp "$CORP" -f "$ROOT/scripts/sync-playlang-csp.jq"
}

for policy_id in "${POLICY_IDS[@]}"; do
  echo "Updating security headers on response headers policy ${policy_id}"
  etag="$(aws cloudfront get-response-headers-policy --id "$policy_id" --query ETag --output text)"
  config="$(
    aws cloudfront get-response-headers-policy \
      --id "$policy_id" \
      --query ResponseHeadersPolicy.ResponseHeadersPolicyConfig \
      --output json
  )"
  updated_config="$(transform_policy_config <<<"$config")"
  aws cloudfront update-response-headers-policy \
    --id "$policy_id" \
    --if-match "$etag" \
    --response-headers-policy-config "$updated_config" \
    >/dev/null
done

echo "CloudFront CSP + CORP synced"
