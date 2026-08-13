/// <reference lib="WebWorker" />

import { PYODIDE_INDEX_URL, type WorkerRequest, type WorkerResponse } from "./protocol.ts";

type Pyodide = {
  setStdout: (options: { batched: (text: string) => void }) => void;
  setStderr: (options: { batched: (text: string) => void }) => void;
  globals: { set: (name: string, value: string) => void };
  runPythonAsync: (code: string) => Promise<unknown>;
};

let pyodidePromise: Promise<Pyodide> | undefined;

async function loadRuntime(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const module = (await import(
        /* @vite-ignore */ `${PYODIDE_INDEX_URL}pyodide.mjs`
      )) as { loadPyodide: (options: { indexURL: string }) => Promise<Pyodide> };
      return module.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    })();
  }
  return pyodidePromise;
}

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  if (message.type === "init") {
    try {
      await loadRuntime();
      post({ type: "ready" });
    } catch (error) {
      post({
        type: "result",
        id: -1,
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }

  const stdout: string[] = [];
  const stderr: string[] = [];
  try {
    const pyodide = await loadRuntime();
    pyodide.setStdout({ batched: (text) => stdout.push(text) });
    pyodide.setStderr({ batched: (text) => stderr.push(text) });
    if (message.stdin) {
      pyodide.globals.set("_playlang_stdin", message.stdin);
      await pyodide.runPythonAsync(
        "import sys\nfrom io import StringIO\nsys.stdin = StringIO(_playlang_stdin)\n",
      );
    }
    await pyodide.runPythonAsync(message.code);
    post({
      type: "result",
      id: message.id,
      ok: true,
      stdout: stdout.join(""),
      stderr: stderr.join(""),
    });
  } catch (error) {
    stderr.push(error instanceof Error ? error.message : String(error));
    post({
      type: "result",
      id: message.id,
      ok: false,
      stdout: stdout.join(""),
      stderr: stderr.join("\n"),
    });
  }
};
