/** Shared WASI + virtual FS host. Filled in when Ruby and other WASI guests land. */

export type WasiIo = {
  stdout: string;
  stderr: string;
};

export function emptyWasiIo(): WasiIo {
  return { stdout: "", stderr: "" };
}
