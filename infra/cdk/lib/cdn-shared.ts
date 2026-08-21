import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";
import {
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  PLAYLANG_CORP,
  playlangContentSecurityPolicy,
} from "./playlang-security";

export {
  CHEERPJ_CDN_ORIGIN,
  JSDELIVR_ORIGIN,
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  PLAYLANG_CORP,
  RUNTIME_CONNECT_SRC,
  RUNTIME_SCRIPT_ORIGINS,
  WASMSHARP_COMLINK_CDN,
  WEBR_CDN_ORIGIN,
  playlangContentSecurityPolicy,
} from "./playlang-security";
export {
  rewritePlaylangVendors,
  rewritePopcornSrcdoc,
  rewriteWasmSharpComlink,
} from "./playlang-vendor";

export const TLS_POLICY = cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021;

export function createWebSecurityHeadersPolicy(
  scope: Construct,
  id: string,
): cloudfront.ResponseHeadersPolicy {
  return createPlaylangResponseHeadersPolicy(scope, id, {
    policyName: "PlaylangWebSecurity",
    cacheControl: "no-cache",
  });
}

/** Same security posture as the SPA, without overriding Cache-Control (long-cache policy applies). */
export function createWebStaticAssetsSecurityHeadersPolicy(
  scope: Construct,
  id: string,
): cloudfront.ResponseHeadersPolicy {
  return createPlaylangResponseHeadersPolicy(scope, id, {
    policyName: "PlaylangWebStaticAssetsSecurity",
    cacheControl: null,
  });
}

function createPlaylangResponseHeadersPolicy(
  scope: Construct,
  id: string,
  options: { policyName: string; cacheControl: string | null },
): cloudfront.ResponseHeadersPolicy {
  const customHeaders: cloudfront.ResponseCustomHeader[] = [
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
    {
      header: "Cross-Origin-Resource-Policy",
      value: PLAYLANG_CORP,
      override: true,
    },
  ];
  if (options.cacheControl !== null) {
    customHeaders.unshift({
      header: "Cache-Control",
      value: options.cacheControl,
      override: true,
    });
  }

  return new cloudfront.ResponseHeadersPolicy(scope, id, {
    responseHeadersPolicyName: options.policyName,
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
      customHeaders,
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
