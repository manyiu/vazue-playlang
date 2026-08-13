import type { RuntimeAdapter } from "./types.ts";

const adapters = new Map<string, RuntimeAdapter>();

export function registerRuntime(adapter: RuntimeAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getRuntime(id: string): RuntimeAdapter | undefined {
  return adapters.get(id);
}

export function listRuntimes(): RuntimeAdapter[] {
  return [...adapters.values()];
}
