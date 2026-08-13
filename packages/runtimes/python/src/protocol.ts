export const PYODIDE_VERSION = "314.0.4";
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type WorkerRequest =
  | { type: "init" }
  | { type: "run"; id: number; code: string; stdin?: string };

export type WorkerResponse =
  | { type: "ready" }
  | { type: "result"; id: number; ok: boolean; stdout: string; stderr: string };
