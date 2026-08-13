import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { runInSandbox } from "./sandbox.ts";
import { transpileTypeScript } from "./transpile.ts";

function entrySource(request: RunRequest, fallback: string): string {
  const path = request.entrypoint ?? fallback;
  return request.files[path] ?? Object.values(request.files)[0] ?? "";
}

export const javascriptRuntime: RuntimeAdapter = {
  id: "javascript",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => undefined,
  run: async (request: RunRequest): Promise<RunResult> => {
    const code = entrySource(request, "main.js");
    return runInSandbox(code, request.timeoutMs);
  },
};

export const typescriptRuntime: RuntimeAdapter = {
  id: "typescript",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => undefined,
  run: async (request: RunRequest): Promise<RunResult> => {
    const source = entrySource(request, "main.ts");
    const { js, diagnostics } = await transpileTypeScript(source);
    if (diagnostics && !js.trim()) {
      return {
        ok: false,
        stdout: "",
        stderr: diagnostics,
        exitCode: 1,
        timingMs: 0,
      };
    }
    const result = await runInSandbox(js, request.timeoutMs);
    if (diagnostics) {
      return {
        ...result,
        stderr: [diagnostics, result.stderr].filter(Boolean).join("\n"),
      };
    }
    return result;
  },
};
