import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { Popcorn } from "@swmansion/popcorn";

type EvalReply = {
  ok?: boolean;
  value?: string;
  error?: string;
};

let popcornPromise: Promise<Popcorn> | undefined;

function appendLine(buffer: { text: string }, line: string): void {
  buffer.text += buffer.text ? `\n${line}` : line;
}

async function ensurePopcorn(): Promise<Popcorn> {
  popcornPromise ??= Popcorn.init({
    bundlePaths: ["/bundle.avm"],
    onStdout: () => undefined,
    onStderr: () => undefined,
  });
  return popcornPromise;
}

function resetPopcorn(): void {
  const pending = popcornPromise;
  popcornPromise = undefined;
  void pending?.then((instance) => instance.deinit()).catch(() => undefined);
}

export const elixirRuntime: RuntimeAdapter = {
  id: "elixir",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensurePopcorn();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const popcorn = await ensurePopcorn();
      const code = entrySource(request, "main.exs");
      const stdoutBuf = { text: "" };
      const stderrBuf = { text: "" };

      const onStdout = (line: string) => appendLine(stdoutBuf, line);
      const onStderr = (line: string) => appendLine(stderrBuf, line);
      popcorn.registerLogListener(onStdout, "stdout");
      popcorn.registerLogListener(onStderr, "stderr");

      try {
        const result = await popcorn.call(
          { code },
          { process: "main", timeoutMs: request.timeoutMs },
        );

        if (!result.ok) {
          const err = capOutput(
            stderrBuf.text || result.error.message || "Elixir call failed",
          );
          const out = capOutput(stdoutBuf.text);
          return {
            ok: false,
            stdout: out.text,
            stderr: err.text,
            exitCode: 1,
            timingMs: Math.round(performance.now() - started),
            truncated: out.truncated || err.truncated,
          };
        }

        const reply = result.data as EvalReply;
        if (reply && reply.ok === false) {
          const err = capOutput(reply.error || stderrBuf.text || "eval failed");
          const out = capOutput(stdoutBuf.text);
          return {
            ok: false,
            stdout: out.text,
            stderr: err.text,
            exitCode: 1,
            timingMs: Math.round(performance.now() - started),
            truncated: out.truncated || err.truncated,
          };
        }

        let stdout = stdoutBuf.text;
        if (!stdout.trim() && typeof reply?.value === "string" && reply.value !== ":ok") {
          stdout = reply.value;
        }
        const out = capOutput(stdout);
        const err = capOutput(stderrBuf.text);
        return {
          ok: !err.text,
          stdout: out.text,
          stderr: err.text,
          exitCode: err.text ? 1 : 0,
          timingMs: Math.round(performance.now() - started),
          truncated: out.truncated || err.truncated,
        };
      } finally {
        popcorn.unregisterLogListener(onStdout, "stdout");
        popcorn.unregisterLogListener(onStderr, "stderr");
      }
    })();

    try {
      return await withTimeout(run, request.timeoutMs, resetPopcorn);
    } catch (error) {
      resetPopcorn();
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
    resetPopcorn();
  },
};
