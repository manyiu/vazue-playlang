import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let configured = false;

export function setupMonaco(): void {
  if (configured) return;
  configured = true;

  window.MonacoEnvironment = {
    getWorker(_workerId: string, label: string) {
      if (label === "json") return new jsonWorker();
      // Default JS path must not pay for the ~5.7 MB TypeScript language service.
      if (label === "typescript") return new tsWorker();
      return new editorWorker();
    },
  };

  loader.config({ monaco });
}
