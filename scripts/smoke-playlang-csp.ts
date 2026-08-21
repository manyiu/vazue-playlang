import {
  PLAYLANG_COEP,
  PLAYLANG_COOP,
  PLAYLANG_CORP,
  playlangContentSecurityPolicy,
} from "../infra/cdk/lib/playlang-security.ts";

const BASE_URL = (process.env.PLAYLANG_URL ?? "https://playlang.vazue.com").replace(/\/$/, "");
const MAX_ATTEMPTS = Number(process.env.PLAYLANG_SMOKE_ATTEMPTS ?? 12);
const RETRY_MS = Number(process.env.PLAYLANG_SMOKE_RETRY_MS ?? 10_000);

function expectHeader(headers: Headers, name: string, expected: string, errors: string[]): void {
  const value = headers.get(name);
  if (!value) {
    errors.push(`missing ${name} header`);
    return;
  }
  if (value !== expected) {
    errors.push(`${name} mismatch\n  expected: ${expected}\n  got:      ${value}`);
  }
}

async function smokeOnce(): Promise<string[]> {
  const errors: string[] = [];
  const expectedCsp = playlangContentSecurityPolicy();

  const indexResponse = await fetch(`${BASE_URL}/`, { redirect: "follow" });
  if (!indexResponse.ok) {
    errors.push(`GET / failed: ${indexResponse.status}`);
    return errors;
  }

  const headers = indexResponse.headers;
  const csp = headers.get("content-security-policy");
  if (!csp) {
    errors.push("missing content-security-policy header");
  } else {
    if (csp !== expectedCsp) {
      errors.push(`content-security-policy mismatch\n  expected: ${expectedCsp}\n  got:      ${csp}`);
    }
    if (csp.includes("frame-ancestors 'none'")) {
      errors.push("content-security-policy still has frame-ancestors 'none' (blocks JS sandbox iframe)");
    }
    if (/script-src[^;]*'unsafe-inline'/i.test(csp)) {
      errors.push("content-security-policy allows script-src 'unsafe-inline'");
    }
    if (!/'unsafe-eval'/.test(csp)) {
      errors.push("content-security-policy is missing script-src 'unsafe-eval' (blocks JS/TS sandbox)");
    }
  }

  expectHeader(headers, "cross-origin-embedder-policy", PLAYLANG_COEP, errors);
  expectHeader(headers, "cross-origin-opener-policy", PLAYLANG_COOP, errors);
  expectHeader(headers, "cross-origin-resource-policy", PLAYLANG_CORP, errors);

  const sandboxHtmlResponse = await fetch(`${BASE_URL}/js-sandbox.html`, { redirect: "follow" });
  if (!sandboxHtmlResponse.ok) {
    errors.push(`GET /js-sandbox.html failed: ${sandboxHtmlResponse.status}`);
  } else {
    expectHeader(
      sandboxHtmlResponse.headers,
      "cross-origin-resource-policy",
      PLAYLANG_CORP,
      errors,
    );
    const html = await sandboxHtmlResponse.text();
    if (!html.includes('src="./js-sandbox.js"')) {
      errors.push("/js-sandbox.html must load guest code from ./js-sandbox.js");
    }
    if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) {
      errors.push("/js-sandbox.html must not use inline scripts under production CSP");
    }
  }

  const sandboxJsResponse = await fetch(`${BASE_URL}/js-sandbox.js`, { redirect: "follow" });
  if (!sandboxJsResponse.ok) {
    errors.push(`GET /js-sandbox.js failed: ${sandboxJsResponse.status}`);
  } else {
    const js = await sandboxJsResponse.text();
    if (!js.includes('source: "playlang-sandbox"')) {
      errors.push("/js-sandbox.js is missing the playlang-sandbox protocol marker");
    }
  }

  const body = await indexResponse.text();
  if (!body.includes('<div id="root"')) {
    errors.push("GET / did not return the Playlang SPA shell");
  }

  return errors;
}

async function main(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const errors = await smokeOnce();
    if (errors.length === 0) {
      console.log(`CSP smoke check passed for ${BASE_URL}`);
      return;
    }

    console.error(`Attempt ${attempt}/${MAX_ATTEMPTS} failed:`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }

    if (attempt === MAX_ATTEMPTS) {
      process.exit(1);
    }

    console.log(`Retrying in ${RETRY_MS}ms (CloudFront may still be propagating)...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
