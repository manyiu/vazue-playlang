import { describe, expect, it } from "vitest";
import { getRuntime, listRuntimes, registerRuntime } from "./registry.ts";
import type { RuntimeAdapter } from "./types.ts";

const stub: RuntimeAdapter = {
  id: "stub",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => undefined,
  run: async () => ({
    ok: true,
    stdout: "ok",
    stderr: "",
    exitCode: 0,
    timingMs: 1,
  }),
};

describe("runtime registry", () => {
  it("registers and looks up adapters", () => {
    registerRuntime(stub);
    expect(getRuntime("stub")).toBe(stub);
    expect(listRuntimes().some((adapter) => adapter.id === "stub")).toBe(true);
  });
});
