import type { RunRequest } from "./types.ts";

export function entrySource(request: RunRequest, fallback: string): string {
  const path = request.entrypoint ?? fallback;
  return request.files[path] ?? Object.values(request.files)[0] ?? "";
}
