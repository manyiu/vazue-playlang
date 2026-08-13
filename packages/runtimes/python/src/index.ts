import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import PyodideWorker from "./pyodide.worker.ts?worker";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.type === "ready" || record.type === "result";
}

let worker: Worker | undefined;
let loadPromise: Promise<void> | undefined;
let nextId = 1;

function spawn(): Worker {
  const next = new PyodideWorker();
  worker = next;
  return next;
}

function reset(): void {
  worker?.terminate();
  worker = undefined;
  loadPromise = undefined;
}

export const pythonRuntime: RuntimeAdapter = {
  id: "python",
  capabilities: { stdin: true, multiFile: false, packages: false },
  load: async () => {
    if (loadPromise) return loadPromise;
    const current = spawn();
    loadPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent<unknown>) => {
        if (!isWorkerResponse(event.data)) return;
        if (event.data.type === "ready") {
          current.removeEventListener("message", onMessage);
          resolve();
        }
        if (event.data.type === "result" && event.data.id === -1) {
          current.removeEventListener("message", onMessage);
          reject(new Error(event.data.stderr || "Failed to load Pyodide"));
        }
      };
      current.addEventListener("message", onMessage);
      current.addEventListener("error", () => {
        reject(new Error("Pyodide worker failed"));
      });
      const init: WorkerRequest = { type: "init" };
      current.postMessage(init);
    });
    try {
      await loadPromise;
    } catch (error) {
      reset();
      throw error;
    }
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    await pythonRuntime.load();
    const current = worker;
    if (!current) {
      return {
        ok: false,
        stdout: "",
        stderr: "Python worker is not running",
        exitCode: 1,
        timingMs: 0,
      };
    }

    const id = nextId++;
    const run = new Promise<RunResult>((resolve) => {
      const onMessage = (event: MessageEvent<unknown>) => {
        if (!isWorkerResponse(event.data) || event.data.type !== "result") return;
        if (event.data.id !== id) return;
        current.removeEventListener("message", onMessage);
        const stdout = capOutput(event.data.stdout);
        const stderr = capOutput(event.data.stderr);
        resolve({
          ok: event.data.ok,
          stdout: stdout.text,
          stderr: stderr.text,
          exitCode: event.data.ok ? 0 : 1,
          timingMs: Math.round(performance.now() - started),
          truncated: stdout.truncated || stderr.truncated,
        });
      };
      current.addEventListener("message", onMessage);
      const message: WorkerRequest = {
        type: "run",
        id,
        code: entrySource(request, "main.py"),
        stdin: request.stdin,
      };
      current.postMessage(message);
    });

    try {
      return await withTimeout(run, request.timeoutMs, reset);
    } catch (error) {
      reset();
      return {
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 124,
        timingMs: Math.round(performance.now() - started),
      };
    }
  },
  dispose: reset,
};
