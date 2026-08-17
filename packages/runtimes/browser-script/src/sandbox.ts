import type { RunResult } from "@playlang/runtime-core";
import { capOutput, withTimeout } from "@playlang/runtime-core";

type SandboxReadyMessage = { source: "playlang-sandbox"; type: "ready" };

type SandboxResultMessage = {
  type: "result";
  ok: boolean;
  stdout: string;
  stderr: string;
};

const LOAD_TIMEOUT_MS = 5_000;
/** Opaque-origin sandbox iframe requires "*" for parent→iframe postMessage delivery. */
const IFRAME_TARGET_ORIGIN = "*";

function isReadyMessage(value: unknown): value is SandboxReadyMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.source === "playlang-sandbox" && record.type === "ready";
}

function isResultMessage(value: unknown): value is SandboxResultMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === "result" &&
    typeof record.ok === "boolean" &&
    typeof record.stdout === "string" &&
    typeof record.stderr === "string"
  );
}

export async function runInSandbox(code: string, timeoutMs: number): Promise<RunResult> {
  const started = performance.now();
  const iframe = document.createElement("iframe");
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("title", "Playlang sandbox");
  iframe.style.display = "none";
  iframe.src = new URL("js-sandbox.html", document.baseURI).href;
  document.body.appendChild(iframe);

  const channel = new MessageChannel();
  let onWindowMessage: ((event: MessageEvent) => void) | undefined;
  let onPortMessage: ((event: MessageEvent) => void) | undefined;
  let loadWatchdog: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const cleanup = () => {
    if (onWindowMessage) {
      window.removeEventListener("message", onWindowMessage);
      onWindowMessage = undefined;
    }
    if (onPortMessage) {
      channel.port1.removeEventListener("message", onPortMessage);
      onPortMessage = undefined;
    }
    channel.port1.close();
    if (loadWatchdog !== undefined) {
      clearTimeout(loadWatchdog);
      loadWatchdog = undefined;
    }
    iframe.remove();
  };

  const run = new Promise<RunResult>((resolve, reject) => {
    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    onPortMessage = (event: MessageEvent) => {
      if (!isResultMessage(event.data)) return;
      const stdout = capOutput(event.data.stdout);
      const stderr = capOutput(event.data.stderr);
      finish({
        ok: event.data.ok,
        stdout: stdout.text,
        stderr: stderr.text,
        exitCode: event.data.ok ? 0 : 1,
        timingMs: Math.round(performance.now() - started),
        truncated: stdout.truncated || stderr.truncated,
      });
    };
    channel.port1.addEventListener("message", onPortMessage);
    channel.port1.start();

    onWindowMessage = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      if (!isReadyMessage(event.data)) return;
      if (loadWatchdog !== undefined) {
        clearTimeout(loadWatchdog);
        loadWatchdog = undefined;
      }
      iframe.contentWindow?.postMessage({ type: "run", code }, IFRAME_TARGET_ORIGIN, [
        channel.port2,
      ]);
    };
    window.addEventListener("message", onWindowMessage);

    loadWatchdog = setTimeout(() => {
      fail(new Error("Sandbox failed to load"));
    }, LOAD_TIMEOUT_MS);

    iframe.addEventListener("error", () => {
      fail(new Error("Failed to load sandbox"));
    });
  });

  try {
    return await withTimeout(run, timeoutMs, cleanup);
  } catch (error) {
    if (!settled) cleanup();
    return {
      ok: false,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: 124,
      timingMs: Math.round(performance.now() - started),
    };
  }
}
