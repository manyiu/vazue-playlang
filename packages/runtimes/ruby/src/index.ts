import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource, withTimeout } from "@playlang/runtime-core";
import { DefaultRubyVM } from "@ruby/wasm-wasi/dist/browser";
import { RUBY_WASM_URL } from "./versions.ts";

type RbValue = {
  call: (method: string, ...args: RbValue[]) => RbValue;
  toString: () => string;
};

type RubyVm = {
  eval: (code: string) => RbValue;
  wrap: (value: unknown) => RbValue;
};

type RubyHandle = {
  vm: RubyVm;
};

let modulePromise: Promise<WebAssembly.Module> | undefined;
let handlePromise: Promise<RubyHandle> | undefined;

async function loadModule(): Promise<WebAssembly.Module> {
  modulePromise ??= (async () => {
    const response = await fetch(RUBY_WASM_URL);
    if (!response.ok) {
      throw new Error(`Failed to download ruby.wasm (${response.status})`);
    }
    return WebAssembly.compileStreaming(response);
  })();
  return modulePromise;
}

async function ensureVm(): Promise<RubyHandle> {
  handlePromise ??= (async () => {
    const module = await loadModule();
    return (await DefaultRubyVM(module, { consolePrint: false })) as unknown as RubyHandle;
  })();
  return handlePromise;
}

function wrapUserCode(code: string): string {
  return `
require "stringio"
_playlang_out = StringIO.new
_playlang_err = StringIO.new
_playlang_old_out, _playlang_old_err = $stdout, $stderr
$stdout, $stderr = _playlang_out, _playlang_err
_playlang_ok = true
begin
${code}
rescue Exception => e
  _playlang_ok = false
  _playlang_err.puts(e.full_message)
ensure
  $stdout, $stderr = _playlang_old_out, _playlang_old_err
end
$_playlang_ok = _playlang_ok
$_playlang_stdout = _playlang_out.string
$_playlang_stderr = _playlang_err.string
nil
`;
}

export const rubyRuntime: RuntimeAdapter = {
  id: "ruby",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    await ensureVm();
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    const run = (async (): Promise<RunResult> => {
      const { vm } = await ensureVm();
      vm.eval(wrapUserCode(entrySource(request, "main.rb")));
      const ok = vm.eval("$_playlang_ok").toString() === "true";
      const stdout = capOutput(vm.eval("$_playlang_stdout").toString().replace(/\n$/, ""));
      const stderr = capOutput(vm.eval("$_playlang_stderr").toString().replace(/\n$/, ""));
      return {
        ok: ok && !stderr.text,
        stdout: stdout.text,
        stderr: stderr.text,
        exitCode: ok && !stderr.text ? 0 : 1,
        timingMs: Math.round(performance.now() - started),
        truncated: stdout.truncated || stderr.truncated,
      };
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
