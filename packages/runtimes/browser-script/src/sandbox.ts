import type { RunResult } from "@playlang/runtime-core";
import { capOutput, withTimeout } from "@playlang/runtime-core";

type SandboxMessage =
  | { source: "playlang-sandbox"; type: "ready" }
  | {
      source: "playlang-sandbox";
      type: "result";
      ok: boolean;
      stdout: string;
      stderr: string;
    };

function isSandboxMessage(value: unknown): value is SandboxMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.source === "playlang-sandbox";
}

export async function runInSandbox(code: string, timeoutMs: number): Promise<RunResult> {
  const started = performance.now();
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("title", "Playlang sandbox");
  iframe.style.display = "none";
  iframe.src = new URL("js-sandbox.html", document.baseURI).href;
  document.body.appendChild(iframe);

  const cleanup = () => {
    iframe.remove();
  };

  const run = new Promise<RunResult>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isSandboxMessage(event.data)) return;
      if (event.data.type === "ready") {
        iframe.contentWindow?.postMessage({ type: "run", code }, "*");
        return;
      }
      if (event.data.type === "result") {
        window.removeEventListener("message", onMessage);
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
      }
    };
    window.addEventListener("message", onMessage);
    iframe.addEventListener("error", () => {
      window.removeEventListener("message", onMessage);
      reject(new Error("Failed to load sandbox"));
    });
  });

  try {
    return await withTimeout(run, timeoutMs, cleanup);
  } catch (error) {
    cleanup();
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 124,
      timingMs: Math.round(performance.now() - started),
    };
  } finally {
    cleanup();
  }
}
