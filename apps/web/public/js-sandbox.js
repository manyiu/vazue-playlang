(() => {
  let running = false;

  const postReady = () => {
    parent.postMessage({ source: "playlang-sandbox", type: "ready" }, "*");
  };

  const stringify = (value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack || value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  window.addEventListener("message", (event) => {
    if (event.source !== parent) return;
    if (!event.data || event.data.type !== "run") return;
    if (running) return;

    const port = event.ports[0];
    if (!port) return;

    running = true;
    port.start();

    const code = String(event.data.code ?? "");
    const stdout = [];
    const stderr = [];

    const capture = (stream) => (...args) => {
      stream.push(args.map(stringify).join(" "));
    };

    console.log = capture(stdout);
    console.info = capture(stdout);
    console.debug = capture(stdout);
    console.warn = capture(stderr);
    console.error = capture(stderr);

    const sendResult = (ok) => {
      port.postMessage({
        type: "result",
        ok,
        stdout: stdout.join("\n"),
        stderr: stderr.join("\n"),
      });
      running = false;
    };

    Promise.resolve()
      .then(() => {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        return new AsyncFunction('"use strict";\n' + code)();
      })
      .then(() => {
        sendResult(true);
      })
      .catch((err) => {
        stderr.push(stringify(err));
        sendResult(false);
      });
  });

  postReady();
})();
