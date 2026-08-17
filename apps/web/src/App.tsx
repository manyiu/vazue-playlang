import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_TIMEOUT_MS,
  LANGUAGES,
  decodeShare,
  encodeShare,
  languageById,
  shareStatusMessage,
  type LanguageInfo,
  type RunResult,
} from "@playlang/runtime-core";
import { isRuntimeId, loadRuntime } from "./runtimes.ts";

const EditorPane = lazy(() =>
  import("./EditorPane.tsx").then((mod) => ({ default: mod.EditorPane })),
);

function filesFor(language: LanguageInfo): Record<string, string> {
  return { [language.examplePath]: language.example };
}

export function App() {
  const shared = useMemo(() => decodeShare(window.location.hash), []);
  const initialLanguage =
    (shared && languageById(shared.languageId)) || languageById("javascript")!;

  const [languageId, setLanguageId] = useState(initialLanguage.id);
  const [files, setFiles] = useState<Record<string, string>>(
    () => shared?.files ?? filesFor(initialLanguage),
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [shareNote, setShareNote] = useState(
    "Anyone with this link can see your code.",
  );
  const [shareCopied, setShareCopied] = useState(false);

  const language = languageById(languageId) ?? initialLanguage;
  const entry = useMemo(() => {
    if (files[language.examplePath] !== undefined) return language.examplePath;
    if (shared?.entrypoint && files[shared.entrypoint] !== undefined) {
      return shared.entrypoint;
    }
    const keys = Object.keys(files);
    return keys[0] ?? language.examplePath;
  }, [files, language.examplePath, shared?.entrypoint]);
  const source = files[entry] ?? "";
  const runnable = language.status === "available" && isRuntimeId(language.id);

  const selectLanguage = (next: LanguageInfo) => {
    setLanguageId(next.id);
    setFiles(filesFor(next));
    setResult(null);
    setShareCopied(false);
  };

  const run = useCallback(async () => {
    if (!isRuntimeId(language.id)) return;
    setRunning(true);
    setResult(null);
    try {
      const runtime = await loadRuntime(language.id);
      await runtime.load();
      // C# / Java / C++ / Elixir cold-start large WASM toolchains; allow more than the default 30s budget.
      const timeoutMs =
        language.id === "csharp" || language.id === "java" || language.id === "elixir"
          ? 120_000
          : language.id === "cpp"
            ? 180_000
            : DEFAULT_TIMEOUT_MS;
      const next = await runtime.run({
        languageId: language.id,
        files,
        entrypoint: entry,
        timeoutMs,
      });
      setResult(next);
    } catch (error) {
      setResult({
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        timingMs: 0,
      });
    } finally {
      setRunning(false);
    }
  }, [entry, files, language.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  const copyLink = async () => {
    const encoded = encodeShare({
      v: 1,
      languageId: language.id,
      files,
      entrypoint: entry,
    });
    setShareNote(shareStatusMessage(encoded.status));
    if (encoded.status === "too_large") {
      setShareCopied(false);
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${encoded.hash}`;
    await navigator.clipboard.writeText(url);
    setShareCopied(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="font-medium tracking-tight">Playlang</p>
          <p className="text-xs text-white/50">
            Runs in your browser. Vazue does not receive your source.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="copy-link"
            onClick={() => void copyLink()}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
          >
            {shareCopied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            data-testid="run"
            disabled={!runnable || running}
            onClick={() => void run()}
            className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
            title="Run (Ctrl/⌘ Enter)"
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-white/10">
          <p className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">
            Languages
          </p>
          {LANGUAGES.map((item) => {
            const active = item.id === language.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`language-${item.id}`}
                onClick={() => selectLanguage(item)}
                className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm ${
                  active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span>{item.name}</span>
                <span className="text-[11px] text-white/35">
                  {item.status === "available"
                    ? `${item.engine} · ${item.version}`
                    : item.status === "coming"
                      ? "Coming"
                      : "Not available"}
                </span>
              </button>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-white/50">
            <span>
              {language.name}
              {runnable
                ? ` · ${language.engine} ${language.version}`
                : ` · ${language.reason ?? language.status}`}
            </span>
            {language.guestNetwork && runnable ? (
              <span>Guest code may use the network</span>
            ) : null}
          </div>
          <div className="min-h-0 flex-1">
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-sm text-white/40">
                  Loading editor…
                </div>
              }
            >
              <EditorPane
                language={language.monacoLanguage}
                path={entry}
                value={source}
                onChange={(value) =>
                  setFiles((current) => ({ ...current, [entry]: value }))
                }
              />
            </Suspense>
          </div>
          <section
            data-testid="output"
            className="h-44 shrink-0 overflow-auto border-t border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
          >
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/40">
              Output
              {result ? ` · ${result.timingMs}ms` : ""}
              {result?.truncated ? " · truncated" : ""}
            </p>
            {!runnable ? (
              <p className="text-white/50">{language.reason}</p>
            ) : running ? (
              <p className="text-white/40">Running…</p>
            ) : result ? (
              <>
                {result.stdout ? (
                  <pre className="whitespace-pre-wrap text-emerald-200/90">{result.stdout}</pre>
                ) : null}
                {result.stderr ? (
                  <pre className="whitespace-pre-wrap text-rose-300/90">{result.stderr}</pre>
                ) : null}
                {!result.stdout && !result.stderr ? (
                  <p className="text-white/40">No output</p>
                ) : null}
              </>
            ) : (
              <p className="text-white/40">Press Run. Code stays in this tab.</p>
            )}
          </section>
        </main>
      </div>

      <footer data-testid="share-note" className="border-t border-white/10 px-4 py-2 text-[11px] text-white/40">
        {shareNote} Share links are snapshots, not live sync.
      </footer>
    </div>
  );
}
