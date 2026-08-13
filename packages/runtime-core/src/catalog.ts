import type { LanguageInfo } from "./types.ts";

export const DEFAULT_TIMEOUT_MS = 30_000;

export const LANGUAGES: LanguageInfo[] = [
  {
    id: "javascript",
    name: "JavaScript",
    monacoLanguage: "javascript",
    engine: "Browser",
    version: "ES2024",
    status: "available",
    guestNetwork: true,
    examplePath: "main.js",
    example: `const greet = (name) => \`Hello, \${name}\`;

console.log(greet("Playlang"));
console.log("2 + 2 =", 2 + 2);
`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    monacoLanguage: "typescript",
    engine: "TypeScript",
    version: "6.0.3",
    status: "available",
    guestNetwork: true,
    examplePath: "main.ts",
    example: `const greet = (name: string): string => \`Hello, \${name}\`;

console.log(greet("Playlang"));
console.log("2 + 2 =", 2 + 2);
`,
  },
  {
    id: "python",
    name: "Python",
    monacoLanguage: "python",
    engine: "Pyodide",
    version: "314.0.4",
    status: "available",
    guestNetwork: true,
    examplePath: "main.py",
    example: `print("Hello, Playlang")
print(2 + 2)
`,
  },
  {
    id: "lua",
    name: "Lua",
    monacoLanguage: "lua",
    engine: "wasmoon",
    version: "5.4",
    status: "available",
    guestNetwork: false,
    examplePath: "main.lua",
    example: `print("Hello, Playlang")
print(2 + 2)
`,
  },
  {
    id: "sql",
    name: "SQL",
    monacoLanguage: "sql",
    engine: "SQLite",
    version: "3",
    status: "available",
    guestNetwork: false,
    examplePath: "query.sql",
    example: `SELECT 'Hello, Playlang' AS greeting, 2 + 2 AS sum;
`,
  },
  {
    id: "ruby",
    name: "Ruby",
    monacoLanguage: "ruby",
    engine: "ruby.wasm",
    version: "3.4",
    status: "available",
    guestNetwork: false,
    examplePath: "main.rb",
    example: `puts "Hello, Playlang"
puts 2 + 2
`,
  },
  {
    id: "php",
    name: "PHP",
    monacoLanguage: "php",
    engine: "php-wasm",
    version: "8.4",
    status: "available",
    guestNetwork: true,
    examplePath: "main.php",
    example: `<?php
echo "Hello, Playlang\\n";
echo 2 + 2;
`,
  },
  {
    id: "go",
    name: "Go",
    monacoLanguage: "go",
    engine: "Yaegi",
    version: "1.25",
    status: "available",
    guestNetwork: false,
    examplePath: "main.go",
    example: `package main

import "fmt"

func main() {
	fmt.Println("Hello, Playlang")
	fmt.Println(2 + 2)
}
`,
  },
  {
    id: "r",
    name: "R",
    monacoLanguage: "r",
    engine: "webR",
    version: "4.5.1",
    status: "available",
    guestNetwork: true,
    examplePath: "main.R",
    example: `print("Hello, Playlang")
print(2 + 2)
`,
  },
  {
    id: "csharp",
    name: "C#",
    monacoLanguage: "csharp",
    engine: "WasmSharp",
    version: "14",
    status: "available",
    guestNetwork: true,
    examplePath: "Program.cs",
    example: `using System;

Console.WriteLine("Hello, Playlang");
Console.WriteLine(2 + 2);
`,
  },
  {
    id: "cpp",
    name: "C / C++",
    monacoLanguage: "cpp",
    engine: "experimental",
    version: "n/a",
    status: "unavailable",
    reason: "Needs a full compiler in the tab — not practical for v1.",
    guestNetwork: false,
    examplePath: "main.cpp",
    example: `#include <iostream>
int main() {
  std::cout << "Hello, Playlang\\n";
}
`,
  },
  {
    id: "rust",
    name: "Rust",
    monacoLanguage: "rust",
    engine: "none",
    version: "n/a",
    status: "unavailable",
    reason: "Needs rustc + Cargo in the browser — too large today.",
    guestNetwork: false,
    examplePath: "main.rs",
    example: `fn main() {
    println!("Hello, Playlang");
}
`,
  },
  {
    id: "swift",
    name: "Swift",
    monacoLanguage: "swift",
    engine: "none",
    version: "n/a",
    status: "unavailable",
    reason: "SwiftWasm compiles apps to WASM; shipping swiftc in the tab is not practical.",
    guestNetwork: false,
    examplePath: "main.swift",
    example: `print("Hello, Playlang")
`,
  },
  {
    id: "haskell",
    name: "Haskell",
    monacoLanguage: "plaintext",
    engine: "none",
    version: "n/a",
    status: "unavailable",
    reason: "GHC WASM is a tech preview — no browser GHCi playground yet.",
    guestNetwork: false,
    examplePath: "Main.hs",
    example: `main = putStrLn "Hello, Playlang"
`,
  },
  {
    id: "elixir",
    name: "Elixir",
    monacoLanguage: "plaintext",
    engine: "none",
    version: "n/a",
    status: "unavailable",
    reason: "OTP-in-browser is still experimental (AtomVM subset).",
    guestNetwork: false,
    examplePath: "main.exs",
    example: `IO.puts("Hello, Playlang")
`,
  },
];

export function languageById(id: string): LanguageInfo | undefined {
  return LANGUAGES.find((language) => language.id === id);
}

export function availableLanguages(): LanguageInfo[] {
  return LANGUAGES.filter((language) => language.status === "available");
}
