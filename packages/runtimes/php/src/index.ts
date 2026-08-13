/// <reference path="./php-wasm-web.d.ts" />
import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { PhpBase } from "php-wasm/PhpBase";
import { PHP_LANGUAGE_VERSION, PHP_WASM_CDN_BASE } from "./versions.ts";

type PhpWebInstance = {
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
  run: (code: string) => Promise<number>;
};

/** Single-version wrapper so Vite does not bundle every PhpWeb binary. */
class Php84Web extends PhpBase {
  constructor() {
    super(import("php-wasm/php8.4-web.mjs"), {
      version: PHP_LANGUAGE_VERSION,
      locateFile: (path) => `${PHP_WASM_CDN_BASE}${path}`,
    });
  }
}

let readyPromise: Promise<PhpWebInstance> | undefined;

function detailText(detail: unknown): string {
  if (Array.isArray(detail)) return detail.map(String).join("");
  if (detail == null) return "";
  return String(detail);
}

function ensurePhp(): Promise<PhpWebInstance> {
  readyPromise ??= new Promise<PhpWebInstance>((resolve, reject) => {
    try {
      const php = new Php84Web() as unknown as PhpWebInstance;
      const onReady = () => {
        php.removeEventListener("ready", onReady);
        resolve(php);
      };
      php.addEventListener("ready", onReady);
    } catch (error) {
      reject(error);
    }
  });
  return readyPromise;
}

export const phpRuntime: RuntimeAdapter = {
  id: "php",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensurePhp();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const php = await ensurePhp();
      const stdout: string[] = [];
      const stderr: string[] = [];

      const onOutput = (event: Event) => {
        stdout.push(detailText((event as CustomEvent).detail));
      };
      const onError = (event: Event) => {
        stderr.push(detailText((event as CustomEvent).detail));
      };

      php.addEventListener("output", onOutput);
      php.addEventListener("error", onError);
      try {
        const code = entrySource(request, "main.php");
        const script = code.includes("<?php") || code.includes("<?=") ? code : `<?php\n${code}`;
        const exitCode = await php.run(script);
        const out = capOutput(stdout.join("").replace(/\n$/, ""));
        const err = capOutput(stderr.join("").replace(/\n$/, ""));
        return {
          ok: exitCode === 0 && !err.text,
          stdout: out.text,
          stderr: err.text,
          exitCode,
          timingMs: Math.round(performance.now() - started),
          truncated: out.truncated || err.truncated,
        };
      } finally {
        php.removeEventListener("output", onOutput);
        php.removeEventListener("error", onError);
      }
    })();

    try {
      return await withTimeout(run, request.timeoutMs, () => {
        readyPromise = undefined;
      });
    } catch (error) {
      readyPromise = undefined;
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
