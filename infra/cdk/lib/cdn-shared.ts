import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import type { Construct } from "constructs";
import {
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  playlangContentSecurityPolicy,
} from "./playlang-security";

export {
  CHEERPJ_CDN_ORIGIN,
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  RUNTIME_CONNECT_SRC,
  playlangContentSecurityPolicy,
} from "./playlang-security";

export const TLS_POLICY = cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021;

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
