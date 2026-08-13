import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { WasmSharpModule, type Diagnostic } from "@wasmsharp/core";

type WasmSharpHandle = Awaited<ReturnType<typeof WasmSharpModule.initializeAsync>>;

let modulePromise: Promise<WasmSharpHandle> | undefined;

function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map((diagnostic) => {
      const where =
        diagnostic.location && !diagnostic.location.isEmpty
          ? ` @${diagnostic.location.start}`
          : "";
      return `${diagnostic.severity} ${diagnostic.id}${where}: ${diagnostic.message}`;
    })
    .join("\n");
}

async function ensureModule(): Promise<WasmSharpHandle> {
  // Worker mode needs HTTPS/localhost; Playwright and local Vite both qualify.
  modulePromise ??= WasmSharpModule.initializeAsync();
  return modulePromise;
}

export const csharpRuntime: RuntimeAdapter = {
  id: "csharp",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensureModule();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const module = await ensureModule();
      const compilation = await module.createCompilationAsync(
        entrySource(request, "Program.cs"),
      );
      const result = await compilation.run();
      if (!result.success) {
        const err = capOutput(formatDiagnostics(result.diagnostics));
        return {
          ok: false,
          stdout: "",
          stderr: err.text,
          exitCode: 1,
          timingMs: Math.round(performance.now() - started),
          truncated: err.truncated,
        };
      }
      const out = capOutput(result.stdOut ?? "");
      const err = capOutput(result.stdErr ?? "");
      return {
        ok: !err.text,
        stdout: out.text,
        stderr: err.text,
        exitCode: err.text ? 1 : 0,
        timingMs: Math.round(performance.now() - started),
        truncated: out.truncated || err.truncated,
      };
    })();

    try {
      return await withTimeout(run, request.timeoutMs, () => {
        modulePromise = undefined;
      });
    } catch (error) {
      modulePromise = undefined;
      return {
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 124,
        timingMs: Math.round(performance.now() - started),
      };
    }
  },
  dispose: () => {
    modulePromise = undefined;
  },
};
