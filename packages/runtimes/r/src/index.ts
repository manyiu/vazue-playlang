import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { ChannelType, WebR } from "webr";
import { WEBR_BASE_URL } from "./versions.ts";

type CaptureChannel = {
  type: string;
  data: unknown;
};

type Shelter = {
  captureR: (
    code: string,
    options?: { withAutoprint?: boolean },
  ) => Promise<{
    output: CaptureChannel[];
    result: unknown;
  }>;
  destroy: (object: unknown) => Promise<void>;
  purge: () => Promise<void>;
};

type WebRHandle = {
  init: () => Promise<void>;
  Shelter: new () => Promise<Shelter>;
};

let handlePromise: Promise<WebRHandle> | undefined;

async function ensureWebR(): Promise<WebRHandle> {
  handlePromise ??= (async () => {
    // Prefer SharedArrayBuffer when cross-origin isolated (COEP+COOP). Forcing
    // PostMessage logs a console warning and disables interrupt / nested REPLs.
    const webR = new WebR({
      baseUrl: WEBR_BASE_URL,
      channelType: ChannelType.Automatic,
    }) as unknown as WebRHandle;
    await webR.init();
    return webR;
  })();
  return handlePromise;
}

function streamText(data: unknown): string {
  if (typeof data === "string") return data;
  if (data == null) return "";
  return String(data);
}

export const rRuntime: RuntimeAdapter = {
  id: "r",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensureWebR();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const webR = await ensureWebR();
      const shelter = await new webR.Shelter();
      try {
        const capture = await shelter.captureR(entrySource(request, "main.R"), {
          withAutoprint: true,
        });
        const stdout: string[] = [];
        const stderr: string[] = [];
        for (const channel of capture.output) {
          if (channel.type === "stdout") stdout.push(streamText(channel.data));
          else if (channel.type === "stderr") stderr.push(streamText(channel.data));
          else if (channel.type === "message" || channel.type === "warning") {
            stderr.push(streamText(channel.data));
          } else if (channel.type === "error") {
            stderr.push(streamText(channel.data));
          }
        }
        try {
          await shelter.destroy(capture.result);
        } catch {
          // ignore destroy failures after capture
        }
        const out = capOutput(stdout.join("\n").replace(/\n$/, ""));
        const err = capOutput(stderr.join("\n").replace(/\n$/, ""));
        return {
          ok: !err.text,
          stdout: out.text,
          stderr: err.text,
          exitCode: err.text ? 1 : 0,
          timingMs: Math.round(performance.now() - started),
          truncated: out.truncated || err.truncated,
        };
      } finally {
        await shelter.purge();
      }
    })();

    try {
      return await withTimeout(run, request.timeoutMs, () => {
        handlePromise = undefined;
      });
    } catch (error) {
      handlePromise = undefined;
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
