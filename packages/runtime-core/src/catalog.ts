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
    id: "java",
    name: "Java",
    monacoLanguage: "java",
    engine: "CheerpJ",
    version: "17",
    status: "available",
    guestNetwork: true,
    examplePath: "Main.java",
    example: `public class Main {
  public static void main(String[] args) {
    System.out.println("Hello, Playlang");
    System.out.println(2 + 2);
  }
}
`,
  },
  {
    id: "cpp",
    name: "C / C++",
    monacoLanguage: "cpp",
    engine: "browsercc",
    version: "0.1.1",
    status: "available",
    guestNetwork: true,
    examplePath: "main.cpp",
    example: `#include <iostream>
int main() {
  std::cout << "Hello, Playlang" << std::endl;
  std::cout << 2 + 2 << std::endl;
}
`,
  },
  {
    id: "elixir",
    name: "Elixir",
    monacoLanguage: "elixir",
    engine: "Popcorn",
    version: "AtomVM",
    status: "coming",
    reason:
      "Needs a cooked .avm eval bundle (Elixir/Mix) plus COOP/COEP for AtomVM threads.",
    guestNetwork: true,
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
