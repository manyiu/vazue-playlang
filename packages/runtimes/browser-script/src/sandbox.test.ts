import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runInSandbox } from "./sandbox.ts";

type MessageHandler = (event: MessageEvent) => void;

class MockMessagePort {
  private listeners = new Set<MessageHandler>();
  started = false;

  addEventListener(_type: "message", handler: MessageHandler) {
    this.listeners.add(handler);
  }

  removeEventListener(_type: "message", handler: MessageHandler) {
    this.listeners.delete(handler);
  }

  start() {
    this.started = true;
  }

  close() {
    this.listeners.clear();
  }

  postMessage(data: unknown) {
    const event = { data } as MessageEvent;
    for (const listener of this.listeners) listener(event);
  }

  dispatch(data: unknown) {
    this.postMessage(data);
  }
}

describe("runInSandbox", () => {
  let windowListeners: Map<string, Set<MessageHandler>>;
  let iframeContentWindow: {
    postMessage: ReturnType<typeof vi.fn>;
  };
  let iframeElement: {
    setAttribute: ReturnType<typeof vi.fn>;
    style: { display: string };
    src: string;
    contentWindow: typeof iframeContentWindow;
    remove: ReturnType<typeof vi.fn>;
    addEventListener: ReturnType<typeof vi.fn>;
  };
  let parentPort: MockMessagePort;
  let childPort: MockMessagePort;

  beforeEach(() => {
    windowListeners = new Map();
    iframeContentWindow = { postMessage: vi.fn() };
    iframeElement = {
      setAttribute: vi.fn(),
      style: { display: "" },
      src: "",
      contentWindow: iframeContentWindow,
      remove: vi.fn(),
      addEventListener: vi.fn(),
    };
    parentPort = new MockMessagePort();
    childPort = new MockMessagePort();

    const mockDocument = {
      createElement: vi.fn(() => iframeElement),
      body: { appendChild: vi.fn(() => iframeElement) },
      baseURI: "http://localhost/js-sandbox.html",
    };
    vi.stubGlobal("document", mockDocument);
    vi.stubGlobal("window", {
      addEventListener: (type: string, handler: MessageHandler) => {
        if (!windowListeners.has(type)) windowListeners.set(type, new Set());
        windowListeners.get(type)!.add(handler);
      },
      removeEventListener: (type: string, handler: MessageHandler) => {
        windowListeners.get(type)?.delete(handler);
      },
      location: { origin: "http://localhost" },
    });
    vi.stubGlobal("performance", { now: vi.fn(() => 1000) });
    vi.stubGlobal("MessageChannel", vi.fn(() => ({ port1: parentPort, port2: childPort })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const dispatchWindowMessage = (data: unknown, source = iframeContentWindow) => {
    const event = { data, source } as unknown as MessageEvent;
    for (const listener of windowListeners.get("message") ?? []) listener(event);
  };

  it("runs code and returns stdout from the sandbox port", async () => {
    const runPromise = runInSandbox('console.log("hello")', 5000);

    dispatchWindowMessage({ source: "playlang-sandbox", type: "ready" });
    expect(iframeContentWindow.postMessage).toHaveBeenCalledWith(
      { type: "run", code: 'console.log("hello")' },
      "*",
      [childPort],
    );

    parentPort.dispatch({
      type: "result",
      ok: true,
      stdout: "hello",
      stderr: "",
    });

    await expect(runPromise).resolves.toEqual({
      ok: true,
      stdout: "hello",
      stderr: "",
      exitCode: 0,
      timingMs: 0,
      truncated: false,
    });
    expect(iframeElement.remove).toHaveBeenCalled();
    expect(windowListeners.get("message")?.size ?? 0).toBe(0);
  });

  it("ignores spoofed window result messages (results must come via MessageChannel)", async () => {
    const runPromise = runInSandbox("while(true){}", 50);

    dispatchWindowMessage({ source: "playlang-sandbox", type: "ready" });
    dispatchWindowMessage({
      source: "playlang-sandbox",
      type: "result",
      ok: true,
      stdout: "spoofed",
      stderr: "",
    });

    await expect(runPromise).resolves.toMatchObject({
      exitCode: 124,
      stderr: expect.stringMatching(/Timed out/),
    });
  });

  it("removes the window listener when the run times out", async () => {
    const runPromise = runInSandbox("while(true){}", 20);
    dispatchWindowMessage({ source: "playlang-sandbox", type: "ready" });

    const result = await runPromise;
    expect(result.exitCode).toBe(124);
    expect(windowListeners.get("message")?.size ?? 0).toBe(0);
    expect(iframeElement.remove).toHaveBeenCalled();
  });

  it("rejects quickly when ready is not received", async () => {
    vi.useFakeTimers();
    const runPromise = runInSandbox('console.log("x")', 5000);
    await vi.advanceTimersByTimeAsync(5001);
    await expect(runPromise).resolves.toMatchObject({
      ok: false,
      exitCode: 124,
      stderr: "Sandbox failed to load",
    });
    vi.useRealTimers();
  });
});
