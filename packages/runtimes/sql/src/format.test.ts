import { describe, expect, it } from "vitest";
import { formatSqlTables } from "./format.ts";

describe("formatSqlTables", () => {
  it("renders an empty result", () => {
    expect(formatSqlTables([])).toBe("(empty result)");
  });

  it("renders columns and rows", () => {
    expect(
      formatSqlTables([
        {
          columns: ["greeting", "sum"],
          values: [["Hello, Playlang", 4]],
        },
      ]),
    ).toBe("greeting | sum\nHello, Playlang | 4");
  });
});
