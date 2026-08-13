export async function transpileTypeScript(
  source: string,
): Promise<{ js: string; diagnostics: string }> {
  const ts = await import("typescript");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
      sourceMap: false,
    },
    reportDiagnostics: true,
    fileName: "main.ts",
  });

  const diagnostics = (result.diagnostics ?? [])
    .map((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      if (diagnostic.start === undefined) return message;
      const line = source.slice(0, diagnostic.start).split("\n").length;
      return `Line ${line}: ${message}`;
    })
    .join("\n");

  return { js: result.outputText, diagnostics };
}
