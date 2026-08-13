export type QueryTable = {
  columns: string[];
  values: unknown[][];
};

export function formatSqlTables(tables: QueryTable[]): string {
  if (tables.length === 0) return "(empty result)";
  return tables
    .map((table) => {
      const header = table.columns.join(" | ");
      const rows = table.values.map((row) =>
        row.map((cell) => (cell === null ? "NULL" : String(cell))).join(" | "),
      );
      return [header, ...rows].join("\n");
    })
    .join("\n\n");
}
