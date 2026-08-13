/// <reference path="./yaegi-assets.d.ts" />
import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import wasmUrl from "yaegi-wasm/src/yaegi-browser.wasm?url";
import wasmExecUrl from "yaegi-wasm/src/wasm_exec.js?url";

type WorkerRequest =
  | { type: "init" }
  | { type: "run"; id: number; code: string; stdin?: string };

type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; ok: boolean; stdout: string; stderr: string };

function absoluteAssetUrl(asset: string): string {
  if (/^https?:\/\//i.test(asset) || asset.startsWith("blob:")) return asset;
  return new URL(asset, globalThis.location?.origin ?? "http://127.0.0.1").href;
}

function createWorkerSource(execUrl: string, moduleUrl: string): string {
  return `
let ready = false;
let initPromise;

async function ensureYaegi() {
  if (ready) return;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    importScripts(${JSON.stringify(execUrl)});
    const go = new Go();
    const response = await fetch(${JSON.stringify(moduleUrl)});
    if (!response.ok) {
      throw new Error("Failed to download yaegi-browser.wasm (" + response.status + ")");
    }
    let instance;
    try {
      const streaming = await WebAssembly.instantiateStreaming(response.clone(), go.importObject);
      instance = streaming.instance;
    } catch {
      const bytes = await response.arrayBuffer();
      instance = (await WebAssembly.instantiate(bytes, go.importObject)).instance;
    }
    go.run(instance);
    if (!self.yaegi || typeof self.yaegi.eval !== "function") {
      throw new Error("Yaegi WASM loaded but self.yaegi.eval is missing");
    }
    ready = true;
  })();
  return initPromise;
}

self.onmessage = async (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "init") {
    try {
      await ensureYaegi();
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({
        type: "result",
        id: -1,
        ok: false,
        stdout: "",
        stderr: error && error.message ? error.message : String(error),
      });
    }
    return;
  }

  if (message.type !== "run") return;
  const id = message.id;
  let stdout = "";
  let stderr = "";
  const originalLog = console.log;
  const originalError = console.error;
  try {
    await ensureYaegi();
    console.log = (...args) => {
      stdout += args.map(String).join(" ") + "\\n";
    };
    console.error = (...args) => {
      stderr += args.map(String).join(" ") + "\\n";
    };
    if (message.stdin && self.setStdin) {
      self.setStdin(String(message.stdin));
    }
    await self.yaegi.eval(String(message.code ?? ""));
    self.postMessage({
      type: "result",
      id,
      ok: !stderr,
      stdout: stdout.replace(/\\n$/, ""),
      stderr: stderr.replace(/\\n$/, ""),
    });
  } catch (error) {
    const messageText = error && error.message ? error.message : String(error);
    self.postMessage({
      type: "result",
      id,
      ok: false,
      stdout: stdout.replace(/\\n$/, ""),
      stderr: (stderr + (stderr ? "\\n" : "") + messageText).replace(/\\n$/, ""),
    });
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
};
`;
}

let worker: Worker | undefined;
let loadPromise: Promise<void> | undefined;
let nextId = 1;

function spawn(): Worker {
  const source = createWorkerSource(absoluteAssetUrl(wasmExecUrl), absoluteAssetUrl(wasmUrl));
  const blob = new Blob([source], { type: "text/javascript" });
  const next = new Worker(URL.createObjectURL(blob));
  worker = next;
  return next;
}

function reset(): void {
  worker?.terminate();
  worker = undefined;
  loadPromise = undefined;
}

function isWorkerResponse(value: unknown): value is WorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.type === "ready" || record.type === "result";
}

export const goRuntime: RuntimeAdapter = {
  id: "go",
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
          reject(new Error(event.data.stderr || "Failed to load Yaegi"));
        }
      };
      current.addEventListener("message", onMessage);
      current.addEventListener("error", () => {
        reject(new Error("Yaegi worker failed"));
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
    await goRuntime.load();
    const current = worker;
    if (!current) {
      return {
        ok: false,
        stdout: "",
        stderr: "Go worker is not running",
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
        code: entrySource(request, "main.go"),
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
