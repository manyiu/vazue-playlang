import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";

/** Pinned runtime CDNs referenced by Playlang adapters (see packages/runtimes versions.ts). */
export const RUNTIME_CONNECT_SRC = [
  "https://cdn.jsdelivr.net",
  "https://webr.r-wasm.org",
  // CheerpJ Java runtime (Community License CDN; do not self-host).
  "https://cjrtnc.leaningtech.com",
  // Pyodide micropip (optional; gated in product copy).
  "https://pypi.org",
  "https://files.pythonhosted.org",
];

/** CheerpJ loader origin — required in script-src (dynamic script tag). */
export const CHEERPJ_CDN_ORIGIN = "https://cjrtnc.leaningtech.com";

/** CSP string applied by CloudFront (testable without constructing a policy). */
export function playlangContentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    // jsDelivr: PHP / Ruby / browsercc (and other) ES modules loaded at runtime.
    `script-src 'self' blob: 'wasm-unsafe-eval' ${CHEERPJ_CDN_ORIGIN} https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${RUNTIME_CONNECT_SRC.join(" ")}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://cjrtnc.leaningtech.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export const TLS_POLICY = cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021;

/** SharedArrayBuffer for Popcorn; credentialless keeps CheerpJ iframes workable. */
export const PLAYLANG_COEP = "credentialless";
export const PLAYLANG_COOP = "same-origin";

export function createWebSecurityHeadersPolicy(
  scope: Construct,
  id: string,
): cloudfront.ResponseHeadersPolicy {
  return new cloudfront.ResponseHeadersPolicy(scope, id, {
    responseHeadersPolicyName: "PlaylangWebSecurity",
    securityHeadersBehavior: {
      strictTransportSecurity: {
        override: true,
        accessControlMaxAge: cdk.Duration.days(365),
        includeSubdomains: false,
        preload: false,
      },
      contentTypeOptions: { override: true },
      referrerPolicy: {
        override: true,
        referrerPolicy:
          cloudfront.HeadersReferrerPolicy.NO_REFERRER,
      },
      contentSecurityPolicy: {
        override: true,
        contentSecurityPolicy: playlangContentSecurityPolicy(),
      },
    },
    customHeadersBehavior: {
      customHeaders: [
        { header: "Cache-Control", value: "no-cache", override: true },
        {
          header: "Cross-Origin-Opener-Policy",
          value: PLAYLANG_COOP,
          override: true,
        },
        {
          header: "Cross-Origin-Embedder-Policy",
          value: PLAYLANG_COEP,
          override: true,
        },
      ],
    },
  });
}

export function createWebStaticAssetsCachePolicy(
  scope: Construct,
  id: string,
): cloudfront.CachePolicy {
  return new cloudfront.CachePolicy(scope, id, {
    cachePolicyName: "PlaylangWebStaticAssets",
    defaultTtl: cdk.Duration.days(365),
    maxTtl: cdk.Duration.days(365),
    minTtl: cdk.Duration.days(1),
    enableAcceptEncodingGzip: true,
    enableAcceptEncodingBrotli: true,
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
  });
}

/** Rewrite extensionless paths to index.html; never rewrite /assets/*.wasm|.dll|.js. */
export function createSpaRoutingFunction(
  scope: Construct,
  id: string,
): cloudfront.Function {
  return new cloudfront.Function(scope, id, {
    functionName: "PlaylangSpaRouting",
    code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var last = uri.split("/").pop() || "";
  if (last.indexOf(".") === -1) {
    request.uri = "/index.html";
  }
  return request;
}
`.trim()),
  });
}
