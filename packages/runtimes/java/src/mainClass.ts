/** Derive FQCN from path + optional package declaration (JavaFiddle-compatible). */
export function deriveMainClass(path: string, content: string): string {
  const base = (path.split("/").pop() ?? "Main").replace(/\.java$/i, "");
  const match = content.match(/^\s*package\s+([\w.]+)\s*;/m);
  if (match?.[1]) return `${match[1]}.${base}`;
  return base;
}
