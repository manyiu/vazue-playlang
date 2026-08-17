(() => {
  const post = (data) => {
    parent.postMessage({ source: "playlang-sandbox", ...data }, "*");
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
    const code = String(event.data.code ?? "");
    const stdout = [];
    const stderr = [];

    const capture = (stream) => (...args) => {
      stream.push(args.map(stringify).join(" "));
    };

    console.log = capture(stdout);
    console.info = capture(stdout);
    console.debug = capture(stdout);
    console.warn = capture(stdout);
    console.error = capture(stderr);

    Promise.resolve()
      .then(() => {
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        return new AsyncFunction(code)();
      })
      .then(() => {
        post({
          type: "result",
          ok: true,
          stdout: stdout.join("\n"),
          stderr: stderr.join("\n"),
        });
      })
      .catch((err) => {
        stderr.push(stringify(err));
        post({
          type: "result",
          ok: false,
          stdout: stdout.join("\n"),
          stderr: stderr.join("\n"),
        });
      });
  });

  post({ type: "ready" });
})();
