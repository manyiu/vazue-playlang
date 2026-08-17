import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TIMEOUT_MS,
  LANGUAGES,
  decodeShareWithStatus,
  encodeShare,
  languageById,
  shareStatusMessage,
  type LanguageInfo,
  type RunResult,
  type SharePayload,
} from "@playlang/runtime-core";
import { Banner } from "./Banner.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { LanguagePicker } from "./LanguagePicker.tsx";
import { OnboardingBanner } from "./OnboardingBanner.tsx";
import { copyToClipboard } from "./copyToClipboard.ts";
import { isRuntimeId, loadRuntime } from "./runtimes.ts";
import {
  hasUnsavedEdits,
  isOnboarded,
  readOutputHeight,
  runModKeyLabel,
  snapshotPayload,
  supportsStdin,
  writeOutputHeight,
} from "./ux/helpers.ts";
import { useIsMobile } from "./ux/useIsMobile.ts";

const EditorPane = lazy(() =>
  import("./EditorPane.tsx").then((mod) => ({ default: mod.EditorPane })),
);

type RunPhase = "idle" | "loading-runtime" | "running";

type PendingLanguageSwitch = {
  language: LanguageInfo;
};

type ClipboardFallback = {
  url: string;
};

function filesFor(language: LanguageInfo): Record<string, string> {
  return { [language.examplePath]: language.example };
}

function buildSharePayload(
  languageId: string,
  files: Record<string, string>,
  entry: string,
  stdin: string,
): SharePayload {
  const payload: SharePayload = {
    v: 1,
    languageId,
    files,
    entrypoint: entry,
  };
  if (stdin.trim()) {
    payload.stdin = stdin;
  }
  return payload;
}

export function App() {
  const shareDecode = useMemo(() => decodeShareWithStatus(window.location.hash), []);
  const initialLanguage =
    (shareDecode.payload && languageById(shareDecode.payload.languageId)) ||
    languageById("javascript")!;

  const [languageId, setLanguageId] = useState(initialLanguage.id);
  const [files, setFiles] = useState<Record<string, string>>(
    () => shareDecode.payload?.files ?? filesFor(initialLanguage),
  );
  const [stdin, setStdin] = useState(shareDecode.payload?.stdin ?? "");
  const [stdinOpen, setStdinOpen] = useState(
    () => Boolean(shareDecode.payload?.stdin?.trim()),
  );
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [shareNote, setShareNote] = useState("Anyone with this link can see your code.");
  const [shareCopied, setShareCopied] = useState(false);
  const [shareEncodeStatus, setShareEncodeStatus] = useState<"ok" | "warn" | "too_large">("ok");
  const [lastCopiedSnapshot, setLastCopiedSnapshot] = useState<string | null>(null);
  const [invalidShareDismissed, setInvalidShareDismissed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboarded());
  const [pendingSwitch, setPendingSwitch] = useState<PendingLanguageSwitch | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [clipboardFallback, setClipboardFallback] = useState<ClipboardFallback | null>(null);
  const outputRef = useRef<HTMLElement>(null);
  const runStartedAt = useRef<number | null>(null);
  const initialOutputHeight = useMemo(() => readOutputHeight(), []);

  const language = languageById(languageId) ?? initialLanguage;
  const entry = useMemo(() => {
    if (files[language.examplePath] !== undefined) return language.examplePath;
    if (shareDecode.payload?.entrypoint && files[shareDecode.payload.entrypoint] !== undefined) {
      return shareDecode.payload.entrypoint;
    }
    const keys = Object.keys(files);
    return keys[0] ?? language.examplePath;
  }, [files, language.examplePath, shareDecode.payload?.entrypoint]);
  const source = files[entry] ?? "";
  const runnable = language.status === "available" && isRuntimeId(language.id);
  const running = runPhase !== "idle";
  const modKey = useMemo(() => runModKeyLabel(), []);
  const isMobile = useIsMobile();
  const stdinSupported = supportsStdin(language.id);

  const currentSnapshot = useMemo(
    () => snapshotPayload(buildSharePayload(language.id, files, entry, stdin)),
    [language.id, files, entry, stdin],
  );
  const shareStale = lastCopiedSnapshot !== null && lastCopiedSnapshot !== currentSnapshot;
  const edited = hasUnsavedEdits(source, language);
  const showInvalidShareBanner =
    shareDecode.error === "invalid_hash" && !invalidShareDismissed;

  const applyLanguage = useCallback((next: LanguageInfo) => {
    setLanguageId(next.id);
    setFiles(filesFor(next));
    setStdin("");
    setStdinOpen(false);
    setResult(null);
    setShareCopied(false);
    setLastCopiedSnapshot(null);
  }, []);

  const requestLanguageSwitch = useCallback(
    (next: LanguageInfo) => {
      if (next.id === language.id) return;
      if (edited || (stdinSupported && stdin.trim())) {
        setPendingSwitch({ language: next });
        return;
      }
      applyLanguage(next);
    },
    [applyLanguage, edited, language.id, stdin, stdinSupported],
  );

  const resetExample = useCallback(() => {
    if (!edited && !stdin.trim()) return;
    setPendingReset(true);
  }, [edited, stdin]);

  const confirmResetExample = useCallback(() => {
    setFiles(filesFor(language));
    setStdin("");
    setStdinOpen(false);
    setResult(null);
    setShareCopied(false);
    setPendingReset(false);
  }, [language]);

  const run = useCallback(async () => {
    if (!isRuntimeId(language.id)) return;
    setRunPhase("loading-runtime");
    setResult(null);
    setElapsedSec(0);
    runStartedAt.current = Date.now();
    try {
      const runtime = await loadRuntime(language.id);
      setRunPhase("running");
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
        stdin: stdinSupported ? stdin : undefined,
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
      setRunPhase("idle");
      runStartedAt.current = null;
    }
  }, [entry, files, language.id, stdin, stdinSupported]);

  useEffect(() => {
    if (runPhase === "idle") return;
    const timer = window.setInterval(() => {
      if (runStartedAt.current) {
        setElapsedSec(Math.floor((Date.now() - runStartedAt.current) / 1000));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runPhase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        if (runnable && !running) void run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, runnable, running]);

  useEffect(() => {
    const node = outputRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      writeOutputHeight(node.getBoundingClientRect().height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const copyLink = async () => {
    const payload = buildSharePayload(language.id, files, entry, stdin);
    const encoded = encodeShare(payload);
    setShareEncodeStatus(encoded.status);
    setShareNote(shareStatusMessage(encoded.status));
    setClipboardFallback(null);
    if (encoded.status === "too_large") {
      setShareCopied(false);
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}#${encoded.hash}`;
    const copied = await copyToClipboard(url);
    if (copied.ok) {
      setShareCopied(true);
      setLastCopiedSnapshot(snapshotPayload(payload));
    } else {
      setShareCopied(false);
      setClipboardFallback({ url });
    }
  };

  const runStatusMessage = () => {
    if (runPhase === "loading-runtime") {
      const hint = language.coldStartHint ? ` ${language.coldStartHint}` : "";
      return `Loading ${language.name} runtime… ${elapsedSec}s${hint}`;
    }
    if (runPhase === "running") {
      return `Running… ${elapsedSec}s`;
    }
    return null;
  };

  const outputLiveMessage = useMemo(() => {
    const status = runStatusMessage();
    if (status) return status;
    if (!runnable) return language.reason ?? language.status;
    if (result) {
      const parts: string[] = [];
      if (result.stdout) parts.push(result.stdout);
      if (result.stderr) parts.push(result.stderr);
      if (!parts.length) return "No output";
      return parts.join("\n");
    }
    return `Press Run or ${modKey}+Enter. Code stays in this tab.`;
  }, [elapsedSec, language, modKey, result, runPhase, runnable]);

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="copy-link"
          onClick={() => void copyLink()}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/5"
        >
          {shareCopied ? "Copied" : "Copy link"}
        </button>
        {shareStale ? (
          <span
            data-testid="share-stale-badge"
            className="rounded-full border border-amber-400/30 bg-amber-950/50 px-2 py-0.5 text-[11px] text-amber-200"
          >
            Link outdated
          </span>
        ) : null}
      </div>
      {shareEncodeStatus === "warn" ? (
        <span data-testid="share-warn" className="text-[11px] text-amber-200/90">
          Long link — some chat apps may truncate it.
        </span>
      ) : null}
      {shareEncodeStatus === "too_large" ? (
        <span data-testid="share-too-large" className="text-[11px] text-rose-200/90">
          Too large to share in a URL.
        </span>
      ) : null}
      <button
        type="button"
        data-testid="run"
        disabled={!runnable || running}
        onClick={() => void run()}
        className="rounded-md bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        title={`Run (${modKey}+Enter)`}
        aria-keyshortcuts="Control+Enter Meta+Enter"
        aria-busy={running}
      >
        {running ? "Running…" : "Run"}
      </button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showOnboarding ? (
        <OnboardingBanner onDismiss={() => setShowOnboarding(false)} />
      ) : null}
      {showInvalidShareBanner ? (
        <Banner
          variant="error"
          testId="invalid-share-banner"
          onDismiss={() => setInvalidShareDismissed(true)}
        >
          This share link couldn&apos;t be loaded. Showing the default example instead.
        </Banner>
      ) : null}
      {clipboardFallback ? (
        <Banner variant="warning" testId="clipboard-fallback" onDismiss={() => setClipboardFallback(null)}>
          <p className="mb-2">Couldn&apos;t copy automatically. Select the link below:</p>
          <input
            data-testid="clipboard-fallback-input"
            readOnly
            value={clipboardFallback.url}
            className="w-full rounded border border-white/15 bg-black/30 px-2 py-1 font-mono text-xs text-white/90"
            onFocus={(event) => event.currentTarget.select()}
          />
        </Banner>
      ) : null}

      <header className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-medium tracking-tight">Playlang</p>
              <LanguagePicker
                languages={LANGUAGES}
                activeId={language.id}
                onSelect={requestLanguageSwitch}
              />
            </div>
            <p className="text-xs text-white/50">
              Runs in your browser. Vazue does not receive your source.
            </p>
          </div>
          {!isMobile ? (
            <div
              data-testid="action-bar"
              className="flex shrink-0 flex-wrap items-center gap-2"
            >
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>

      <div className={`flex min-h-0 flex-1 flex-col lg:flex-row ${isMobile ? "pb-24" : ""}`}>
        <aside
          className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/10 lg:block"
          aria-label="Languages"
          role="navigation"
        >
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
                onClick={() => requestLanguageSwitch(item)}
                aria-current={active ? "true" : undefined}
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

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2 text-xs text-white/50">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {language.name}
                {runnable
                  ? ` · ${language.engine} ${language.version}`
                  : ` · ${language.reason ?? language.status}`}
              </span>
              <button
                type="button"
                data-testid="reset-example"
                disabled={!edited && !stdin.trim()}
                onClick={resetExample}
                className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/70 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Reset example
              </button>
            </div>
            {language.guestNetwork && runnable ? (
              <span
                className="inline-flex items-center gap-1 text-amber-200/90"
                title="Code you run can fetch external URLs from this browser."
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  fill="currentColor"
                >
                  <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.5a5.5 5.5 0 0 1 4.35 8.84l-1.1-1.1A4 4 0 1 0 8 4v1.5L4.5 2 8-.5V1.5A5.5 5.5 0 0 1 8 2.5Z" />
                </svg>
                Network access enabled
              </span>
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

          {stdinSupported ? (
            <section className="shrink-0 border-t border-white/10 bg-black/20">
              <button
                type="button"
                data-testid="stdin-toggle"
                onClick={() => setStdinOpen((open) => !open)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] uppercase tracking-wider text-white/40 hover:bg-white/5"
                aria-expanded={stdinOpen}
              >
                <span>Program input (stdin)</span>
                <span aria-hidden="true">{stdinOpen ? "−" : "+"}</span>
              </button>
              {stdinOpen ? (
                <textarea
                  data-testid="stdin-input"
                  value={stdin}
                  onChange={(event) => setStdin(event.target.value)}
                  placeholder="Input passed to your program on run"
                  className="h-20 w-full resize-y border-t border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white/90 outline-none"
                />
              ) : null}
            </section>
          ) : null}

          <section
            ref={outputRef}
            data-testid="output"
            aria-live="polite"
            aria-atomic="true"
            style={initialOutputHeight ? { height: `${initialOutputHeight}px` } : undefined}
            className="min-h-[7.5rem] max-h-[60vh] shrink-0 resize-y overflow-auto border-t border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
          >
            <p className="sr-only" aria-live="polite">
              {outputLiveMessage}
            </p>
            <p className="mb-1 text-[11px] uppercase tracking-wider text-white/40">
              Output
              {result ? ` · ${result.timingMs}ms` : ""}
              {result?.truncated ? " · truncated" : ""}
            </p>
            {!runnable ? (
              <p className="text-white/50">{language.reason}</p>
            ) : running ? (
              <p className="text-white/40">{runStatusMessage()}</p>
            ) : result ? (
              <>
                {result.stdout ? (
                  <pre className="whitespace-pre-wrap text-emerald-200/90">
                    <span className="sr-only">Standard output: </span>
                    {result.stdout}
                  </pre>
                ) : null}
                {result.stderr ? (
                  <pre className="whitespace-pre-wrap text-rose-300/90">
                    <span className="sr-only">Standard error: </span>
                    {result.stderr}
                  </pre>
                ) : null}
                {!result.stdout && !result.stderr ? (
                  <p className="text-white/40">No output</p>
                ) : null}
              </>
            ) : (
              <p className="text-white/40">
                Press Run or {modKey}+Enter. Code stays in this tab.
              </p>
            )}
          </section>
        </main>
      </div>

      {isMobile ? (
        <div
          data-testid="action-bar-mobile"
          className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0c0e12]/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <p data-testid="share-note-mobile" className="mb-2 text-[11px] text-white/40">
            {shareNote}
          </p>
          {headerActions}
        </div>
      ) : null}

      <footer
        data-testid="share-note"
        className="hidden border-t border-white/10 px-4 py-2 text-[11px] text-white/40 md:block"
      >
        {shareNote} Share links are snapshots, not live sync.{" "}
        <a
          href="https://vazue.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/55 underline hover:text-white/75"
        >
          Vazue
        </a>
        {" · "}
        <a
          href="https://github.com/manyiu/vazue-playlang"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/55 underline hover:text-white/75"
        >
          GitHub
        </a>
        {" · "}
        <a
          href="https://github.com/manyiu/vazue-playlang/blob/main/NOTICE"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/55 underline hover:text-white/75"
        >
          Licenses
        </a>
      </footer>

      {pendingSwitch ? (
        <ConfirmDialog
          title={`Switch to ${pendingSwitch.language.name}?`}
          message="Your current code will be replaced."
          confirmLabel="Switch"
          onConfirm={() => {
            applyLanguage(pendingSwitch.language);
            setPendingSwitch(null);
          }}
          onCancel={() => setPendingSwitch(null)}
        />
      ) : null}
      {pendingReset ? (
        <ConfirmDialog
          title="Reset to example?"
          message="Your current code and stdin input will be replaced."
          confirmLabel="Reset"
          onConfirm={confirmResetExample}
          onCancel={() => setPendingReset(false)}
        />
      ) : null}
    </div>
  );
}
