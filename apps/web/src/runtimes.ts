import type { RuntimeAdapter } from "@playlang/runtime-core";

const runtimeIds = [
  "javascript",
  "typescript",
  "python",
  "lua",
  "sql",
  "ruby",
  "php",
  "go",
  "r",
  "csharp",
  "java",
  "cpp",
] as const;

export type RuntimeId = (typeof runtimeIds)[number];

const cache = new Map<RuntimeId, Promise<RuntimeAdapter>>();

export function isRuntimeId(id: string): id is RuntimeId {
  return (runtimeIds as readonly string[]).includes(id);
}

export function loadRuntime(id: RuntimeId): Promise<RuntimeAdapter> {
  const existing = cache.get(id);
  if (existing) return existing;

  const pending = (async (): Promise<RuntimeAdapter> => {
    switch (id) {
      case "javascript": {
        const mod = await import("@playlang/runtime-browser-script");
        return mod.javascriptRuntime;
      }
      case "typescript": {
        const mod = await import("@playlang/runtime-browser-script");
        return mod.typescriptRuntime;
      }
      case "python": {
        const mod = await import("@playlang/runtime-python");
        return mod.pythonRuntime;
      }
      case "lua": {
        const mod = await import("@playlang/runtime-lua");
        return mod.luaRuntime;
      }
      case "sql": {
        const mod = await import("@playlang/runtime-sql");
        return mod.sqlRuntime;
      }
      case "ruby": {
        const mod = await import("@playlang/runtime-ruby");
        return mod.rubyRuntime;
      }
      case "php": {
        const mod = await import("@playlang/runtime-php");
        return mod.phpRuntime;
      }
      case "go": {
        const mod = await import("@playlang/runtime-go");
        return mod.goRuntime;
      }
      case "r": {
        const mod = await import("@playlang/runtime-r");
        return mod.rRuntime;
      }
      case "csharp": {
        const mod = await import("@playlang/runtime-csharp");
        return mod.csharpRuntime;
      }
      case "java": {
        const mod = await import("@playlang/runtime-java");
        return mod.javaRuntime;
      }
      case "cpp": {
        const mod = await import("@playlang/runtime-cpp");
        return mod.cppRuntime;
      }
      default: {
        const _exhaustive: never = id;
        throw new Error(`Unknown runtime: ${_exhaustive}`);
      }
    }
  })();

  cache.set(id, pending);
  return pending;
}
