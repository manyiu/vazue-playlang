import * as lzStringNs from "lz-string";
import type { ShareEncodeResult, SharePayload } from "./types.ts";

type LzStringApi = {
  compressToEncodedURIComponent: (input: string) => string;
  decompressFromEncodedURIComponent: (input: string) => string | null;
};

const lzString: LzStringApi =
  (lzStringNs as unknown as { default?: LzStringApi }).default ??
  (lzStringNs as unknown as LzStringApi);

export const SHARE_WARN_BYTES = 8 * 1024;
export const SHARE_MAX_BYTES = 32 * 1024;

const PREFIX = "p=";

function isSharePayload(value: unknown): value is SharePayload {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (record.v !== 1) return false;
  if (typeof record.languageId !== "string" || record.languageId.length === 0) {
    return false;
  }
  if (typeof record.files !== "object" || record.files === null) return false;
  for (const [path, source] of Object.entries(record.files)) {
    if (typeof path !== "string" || typeof source !== "string") return false;
  }
  if (record.entrypoint !== undefined && typeof record.entrypoint !== "string") {
    return false;
  }
  if (record.stdin !== undefined && typeof record.stdin !== "string") {
    return false;
  }
  return true;
}

export function isShareHash(hash: string): boolean {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  return raw.startsWith(PREFIX) && raw.length > PREFIX.length;
}

export type ShareDecodeResult =
  | { payload: SharePayload; error: null }
  | { payload: null; error: null }
  | { payload: null; error: "invalid_hash" };

export function decodeShareWithStatus(hash: string): ShareDecodeResult {
  if (!hash || hash === "#") {
    return { payload: null, error: null };
  }
  const payload = decodeShare(hash);
  if (payload) {
    return { payload, error: null };
  }
  if (isShareHash(hash)) {
    return { payload: null, error: "invalid_hash" };
  }
  return { payload: null, error: null };
}

export function encodeShare(payload: SharePayload): ShareEncodeResult {
  const json = JSON.stringify(payload);
  const encoded = lzString.compressToEncodedURIComponent(json);
  const hash = `${PREFIX}${encoded}`;
  const bytes = new TextEncoder().encode(hash).length;
  const status =
    bytes > SHARE_MAX_BYTES ? "too_large" : bytes > SHARE_WARN_BYTES ? "warn" : "ok";
  return { hash, bytes, status };
}

export function decodeShare(hash: string): SharePayload | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(PREFIX)) return null;
  const encoded = raw.slice(PREFIX.length);
  if (!encoded) return null;
  let json: string | null;
  try {
    json = lzString.decompressFromEncodedURIComponent(encoded);
  } catch {
    return null;
  }
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    return isSharePayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function shareStatusMessage(status: ShareEncodeResult["status"]): string {
  switch (status) {
    case "warn":
      return "This link is long; some chat apps may truncate it.";
    case "too_large":
      return "Too large to share in a URL. Shrink the snippet (no silent truncation).";
    default:
      return "Anyone with this link can see your code.";
  }
}
