import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { cheerpj } from "./cheerpj.ts";
import { deriveMainClass } from "./mainClass.ts";
import {
  CHEERPJ_LOADER_URL,
  CHEERPJ_TOOLS_CLASSPATH,
} from "./versions.ts";

export { deriveMainClass } from "./mainClass.ts";

const HOST_ID = "playlang-cheerpj-host";
const CONSOLE_ID = "console";

/** Compiles alongside user code; redirects System.out/err to VFS files. */
const RUNNER_SOURCE = `import java.io.*;
import java.lang.reflect.*;

public class PlaylangRunner {
  public static void main(String[] args) throws Exception {
    if (args.length < 1) {
      System.err.println("PlaylangRunner: missing main class");
      System.exit(2);
    }
    PrintStream out = new PrintStream(new FileOutputStream("/files/playlang-stdout.txt"));
    PrintStream err = new PrintStream(new FileOutputStream("/files/playlang-stderr.txt"));
    System.setOut(out);
    System.setErr(err);
    try {
      Class<?> cls = Class.forName(args[0]);
      Method m = cls.getMethod("main", String[].class);
      m.invoke(null, (Object) new String[0]);
      out.flush();
      err.flush();
    } catch (InvocationTargetException e) {
      Throwable c = e.getCause() != null ? e.getCause() : e;
      c.printStackTrace();
      out.flush();
      err.flush();
      System.exit(1);
    }
  }
}
`;

let loadPromise: Promise<void> | undefined;
let displayReady = false;

function addStringFile(path: string, data: string | Uint8Array): void {
  const api = cheerpj();
  if (typeof api.cheerpOSAddStringFile === "function") {
    api.cheerpOSAddStringFile(path, data);
    return;
  }
  if (typeof api.cheerpjAddStringFile === "function") {
    api.cheerpjAddStringFile(path, data);
    return;
  }
  throw new Error("CheerpJ filesystem API is unavailable");
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof cheerpj().cheerpjInit === "function") {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-playlang-cheerpj="1"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error(`Failed to load CheerpJ from ${url}`)),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.playlangCheerpj = "1";
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load CheerpJ from ${url}`));
    document.head.appendChild(script);
  });
}

function ensureCheerpJDom(): void {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:640px;height:480px;overflow:hidden;opacity:0;pointer-events:none;";
    document.body.appendChild(host);
  }

  if (!document.getElementById(CONSOLE_ID)) {
    const consoleEl = document.createElement("pre");
    consoleEl.id = CONSOLE_ID;
    host.appendChild(consoleEl);
  }

  if (!document.getElementById("output")) {
    const outputAlias = document.createElement("div");
    outputAlias.id = "output";
    host.appendChild(outputAlias);
  }
}

function readConsoleText(): string {
  const el = document.getElementById(CONSOLE_ID);
  return (el?.innerText ?? "").replace(/\u00a0/g, " ").trimEnd();
}

function clearConsole(): void {
  const el = document.getElementById(CONSOLE_ID);
  if (el) el.innerHTML = "";
}

async function readVfsText(path: string): Promise<string> {
  const api = cheerpj();
  if (typeof api.cjFileBlob !== "function") return "";
  try {
    const blob = await api.cjFileBlob(path);
    return (await blob.text()).replace(/\u00a0/g, " ").trimEnd();
  } catch {
    return "";
  }
}

async function ensureCheerpJ(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    await loadScript(CHEERPJ_LOADER_URL);
    const api = cheerpj();
    if (typeof api.cheerpjInit !== "function") {
      throw new Error("CheerpJ loader did not expose cheerpjInit");
    }
    ensureCheerpJDom();
    await api.cheerpjInit({ status: "none" });
    if (!displayReady) {
      const outputMount = document.getElementById("output");
      api.cheerpjCreateDisplay(-1, -1, outputMount);
      displayReady = true;
      document.querySelector(".cheerpjLoading")?.remove();
    }
  })();
  try {
    await loadPromise;
  } catch (error) {
    loadPromise = undefined;
    displayReady = false;
    throw error;
  }
}

function reset(): void {
  loadPromise = undefined;
  displayReady = false;
  document.getElementById(HOST_ID)?.remove();
  // If #console / #output were under host they are gone; if orphaned, clear text.
  clearConsole();
}

export const javaRuntime: RuntimeAdapter = {
  id: "java",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensureCheerpJ();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      await ensureCheerpJ();
      const api = cheerpj();
      const entry = request.entrypoint || "Main.java";
      const code = entrySource(request, "Main.java");
      const sourceName = entry.split("/").pop() ?? "Main.java";
      const sourcePath = `/str/${sourceName}`;
      addStringFile(sourcePath, new TextEncoder().encode(code));
      addStringFile(
        "/str/PlaylangRunner.java",
        new TextEncoder().encode(RUNNER_SOURCE),
      );
      clearConsole();

      const compileCode = await api.cheerpjRunMain(
        "com.sun.tools.javac.Main",
        CHEERPJ_TOOLS_CLASSPATH,
        sourcePath,
        "/str/PlaylangRunner.java",
        "-d",
        "/files/",
        "-Xlint",
      );
      const compileLog = readConsoleText();
      if (compileCode !== 0) {
        const err = capOutput(
          compileLog || `javac exited with code ${compileCode}`,
        );
        return {
          ok: false,
          stdout: "",
          stderr: err.text,
          exitCode: compileCode || 1,
          timingMs: Math.round(performance.now() - started),
          truncated: err.truncated,
        };
      }

      clearConsole();
      const mainClass = deriveMainClass(entry, code);
      const exitCode = await api.cheerpjRunMain(
        "PlaylangRunner",
        CHEERPJ_TOOLS_CLASSPATH,
        mainClass,
      );

      let stdout = await readVfsText("/files/playlang-stdout.txt");
      let stderr = await readVfsText("/files/playlang-stderr.txt");
      // Fallback if VFS redirect failed but CheerpJ wrote the live console.
      if (!stdout && !stderr) {
        const consoleText = readConsoleText();
        if (exitCode === 0) stdout = consoleText;
        else stderr = consoleText;
      }

      const out = capOutput(stdout);
      const err = capOutput(
        stderr ||
          (exitCode === 0 ? "" : `Java exited with code ${exitCode}`),
      );
      return {
        ok: exitCode === 0 && !err.text,
        stdout: out.text,
        stderr: err.text,
        exitCode: exitCode === 0 && err.text ? 1 : exitCode,
        timingMs: Math.round(performance.now() - started),
        truncated: out.truncated || err.truncated,
      };
    })();

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
