import type { RunRequest, RunResult, RuntimeAdapter } from "@playlang/runtime-core";
import { capOutput, entrySource } from "@playlang/runtime-core";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import sqlWasm from "sql.js/dist/sql-wasm.wasm?url";
import { formatSqlTables } from "./format.ts";

let SQL: SqlJsStatic | undefined;

export const sqlRuntime: RuntimeAdapter = {
  id: "sql",
  capabilities: { stdin: false, multiFile: false, packages: false },
  load: async () => {
    SQL ??= await initSqlJs({ locateFile: () => sqlWasm });
  },
  run: async (request: RunRequest): Promise<RunResult> => {
    const started = performance.now();
    try {
      await sqlRuntime.load();
      if (!SQL) throw new Error("SQLite failed to load");
      const db = new SQL.Database();
      try {
        const tables = db.exec(entrySource(request, "query.sql"));
        const stdout = capOutput(formatSqlTables(tables));
        return {
          ok: true,
          stdout: stdout.text,
          stderr: "",
          exitCode: 0,
          timingMs: Math.round(performance.now() - started),
          truncated: stdout.truncated,
        };
      } finally {
        db.close();
      }
    } catch (error) {
      return {
        ok: false,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
        timingMs: Math.round(performance.now() - started),
      };
    }
  },
};
