/** Shared types for WASI-style guests. Ruby currently uses DefaultRubyVM (embeds a WASI shim). */

export type WasiIo = {
  stdout: string;
  stderr: string;
};

export function emptyWasiIo(): WasiIo {
  return { stdout: "", stderr: "" };
}

export function appendLine(target: string[], chunk: string): void {
  if (!chunk) return;
  target.push(chunk);
}
