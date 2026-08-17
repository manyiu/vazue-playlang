#!/usr/bin/env bash
# Push the canonical CSP from playlang-security.ts onto both CloudFront
# response header policies attached to PlaylangWebStack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

CSP="$(pnpm exec tsx -e "import { playlangContentSecurityPolicy } from './infra/cdk/lib/playlang-security.ts'; process.stdout.write(playlangContentSecurityPolicy());")"

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

for policy_id in "${POLICY_IDS[@]}"; do
  echo "Updating CSP on response headers policy ${policy_id}"
  etag="$(aws cloudfront get-response-headers-policy --id "$policy_id" --query ETag --output text)"
  config="$(
    aws cloudfront get-response-headers-policy \
      --id "$policy_id" \
      --query ResponseHeadersPolicy.ResponseHeadersPolicyConfig \
      --output json
  )"
  updated_config="$(jq --arg csp "$CSP" '.SecurityHeadersConfig.ContentSecurityPolicy.ContentSecurityPolicy = $csp' <<<"$config")"
  aws cloudfront update-response-headers-policy \
    --id "$policy_id" \
    --if-match "$etag" \
    --response-headers-policy-config "$updated_config" \
    >/dev/null
done

echo "CloudFront CSP synced"
