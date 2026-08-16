import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { compileFlags } from "./flags.ts";
import {
  BROWSERCC_MODULE_URL,
  BROWSER_WASI_SHIM_URL,
} from "./versions.ts";

type BrowserCcCompile = (job: {
  source: string;
  fileName: string;
  flags: string[];
  extraFiles?: Record<string, string | ArrayBuffer>;
}) => Promise<{
  compileOutput: string;
  module: WebAssembly.Module | null;
}>;

type BrowserCcModule = {
  compile: BrowserCcCompile;
};

type WasiShimModule = {
  WASI: new (
    args: string[],
    env: string[],
    fds: unknown[],
  ) => {
    wasiImport: WebAssembly.Imports[string];
    start: (instance: {
      exports: { memory: WebAssembly.Memory; _start: () => unknown };
    }) => number | void;
  };
  File: new (data: Uint8Array) => unknown;
  OpenFile: new (file: unknown) => unknown;
  ConsoleStdout: new (write: (data: Uint8Array) => void) => unknown;
};

let browserccPromise: Promise<BrowserCcModule> | undefined;
let wasiPromise: Promise<WasiShimModule> | undefined;

function loadBrowserCc(): Promise<BrowserCcModule> {
  browserccPromise ??= import(
    /* @vite-ignore */ BROWSERCC_MODULE_URL
  ) as Promise<BrowserCcModule>;
  return browserccPromise;
}

function loadWasiShim(): Promise<WasiShimModule> {
  wasiPromise ??= import(
    /* @vite-ignore */ BROWSER_WASI_SHIM_URL
  ) as Promise<WasiShimModule>;
  return wasiPromise;
}

async function ensureToolchain(): Promise<{
  browsercc: BrowserCcModule;
  wasi: WasiShimModule;
}> {
  const [browsercc, wasi] = await Promise.all([
    loadBrowserCc(),
    loadWasiShim(),
  ]);
  return { browsercc, wasi };
}

function runModule(
  wasiMod: WasiShimModule,
  module: WebAssembly.Module,
  stdinText: string,
): { stdout: string; stderr: string; exitCode: number } {
  let stdout = "";
  let stderr = "";
  const stdinBytes = new TextEncoder().encode(stdinText);
  const fds = [
    new wasiMod.OpenFile(new wasiMod.File(stdinBytes)),
    new wasiMod.ConsoleStdout((data: Uint8Array) => {
      stdout += new TextDecoder().decode(data);
    }),
    new wasiMod.ConsoleStdout((data: Uint8Array) => {
      stderr += new TextDecoder().decode(data);
    }),
  ];
  const wasi = new wasiMod.WASI([], [], fds);
  const instance = new WebAssembly.Instance(module, {
    wasi_snapshot_preview1: wasi.wasiImport,
  });
  let exitCode = 0;
  try {
    const code = wasi.start(
      instance as unknown as {
        exports: { memory: WebAssembly.Memory; _start: () => unknown };
      },
    );
    exitCode = typeof code === "number" ? code : 0;
  } catch (error) {
    // WASI often throws on non-zero exit via proc_exit.
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/exit(?:ed)?(?: with)?(?: code)?[:\s]+(\d+)/i);
    if (match?.[1]) {
      exitCode = Number(match[1]);
    } else if (!stderr) {
      stderr = message;
      exitCode = 1;
    }
  }
  return { stdout, stderr, exitCode };
}

export const cppRuntime: RuntimeAdapter = {
  id: "cpp",
  capabilities: { stdin: true, multiFile: false, packages: false },
  load: async () => {
    await ensureToolchain();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const { browsercc, wasi } = await ensureToolchain();
      const entry = request.entrypoint || "main.cpp";
      const source = entrySource(request, "main.cpp");
      const fileName = entry.split("/").pop() || "main.cpp";
      const { compileOutput, module } = await browsercc.compile({
        source,
        fileName,
        flags: compileFlags(fileName),
      });
      if (!module) {
        const err = capOutput(
          compileOutput.trim() || "Compilation failed (no WASM module)",
        );
        return {
          ok: false,
          stdout: "",
          stderr: err.text,
          exitCode: 1,
          timingMs: Math.round(performance.now() - started),
          truncated: err.truncated,
        };
      }

      const executed = runModule(wasi, module, request.stdin ?? "");
      const out = capOutput(executed.stdout.replace(/\n$/, ""));
      const err = capOutput(
        (executed.stderr || (executed.exitCode !== 0 ? compileOutput : "")).trim(),
      );
      return {
        ok: executed.exitCode === 0 && !err.text,
        stdout: out.text,
        stderr: err.text,
        exitCode: executed.exitCode,
        timingMs: Math.round(performance.now() - started),
        truncated: out.truncated || err.truncated,
      };
    })();

    try {
      return await withTimeout(run, request.timeoutMs, () => {
        browserccPromise = undefined;
        wasiPromise = undefined;
      });
    } catch (error) {
      browserccPromise = undefined;
      wasiPromise = undefined;
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
    browserccPromise = undefined;
    wasiPromise = undefined;
  },
};
