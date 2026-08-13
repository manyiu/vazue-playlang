import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { LuaFactory } from "wasmoon";
import wasmUrl from "wasmoon/dist/glue.wasm?url";

let factory: LuaFactory | undefined;

export const luaRuntime: RuntimeAdapter = {
  id: "lua",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    factory ??= new LuaFactory(wasmUrl);
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    await luaRuntime.load();
    if (!factory) {
      return {
        ok: false,
        stdout: "",
        stderr: "Lua factory is not ready",
        exitCode: 1,
        timingMs: 0,
      };
    }

    const lines: string[] = [];
    const run = (async (): Promise<RunResult> => {
      const engine = await factory!.createEngine();
      try {
        engine.global.set("print", (...args: unknown[]) => {
          lines.push(args.map((value) => String(value)).join("\t"));
        });
        await engine.doString(entrySource(request, "main.lua"));
        const stdout = capOutput(lines.join("\n"));
        return {
          ok: true,
          stdout: stdout.text,
          stderr: "",
          exitCode: 0,
          timingMs: Math.round(performance.now() - started),
          truncated: stdout.truncated,
        };
      } catch (error) {
        const stdout = capOutput(lines.join("\n"));
        const stderr = capOutput(error instanceof Error ? error.message : String(error));
        return {
          ok: false,
          stdout: stdout.text,
          stderr: stderr.text,
          exitCode: 1,
          timingMs: Math.round(performance.now() - started),
          truncated: stdout.truncated || stderr.truncated,
        };
      } finally {
        engine.global.close();
      }
    })();

    try {
      return await withTimeout(run, request.timeoutMs, () => engineAbort());
    } catch (error) {
      return {
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 124,
        timingMs: Math.round(performance.now() - started),
      };
    }
  },
};

function engineAbort(): void {
  // wasmoon has no cooperative kill; timeout still unblocks the UI promise.
}
