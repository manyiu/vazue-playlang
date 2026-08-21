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
    example: `const user = { name: "Playlang", role: "guest", active: true };
const { name, ...rest } = user;

console.log(\`Hello, \${name}\`);
console.log("extra keys:", Object.keys(rest).join(", "));
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
    example: `interface User {
  name: string;
  role: string;
}

const greet = (user: User): string => \`Hello, \${user.name}\`;

console.log(greet({ name: "Playlang", role: "guest" }));
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
    example: `squares = [n * n for n in range(1, 6)]
print("Hello, Playlang")
print(squares)
`,
    coldStartHint: "First run may take 15–30s while Python downloads.",
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
    example: `local user = { name = "Playlang", role = "guest" }
print("Hello, " .. user.name)
for key, value in pairs(user) do
  print(key, value)
end
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
    example: `WITH nums(n) AS (
  VALUES (1), (2), (3), (4), (5)
)
SELECT 'Hello, Playlang' AS greeting, n, n * n AS square
FROM nums
WHERE n % 2 = 1;
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
    example: `squares = (1..5).map { |n| n * n }
puts "Hello, Playlang"
puts squares.inspect
puts squares.reduce(0) { |acc, n| acc + n }
`,
    coldStartHint: "First run may take 15–30s while Ruby downloads.",
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
$user = ["name" => "Playlang", "role" => "guest"];
echo "Hello, {$user['name']}\\n";
echo implode(", ", array_keys($user));
`,
    coldStartHint: "First run may take 15–30s while PHP downloads.",
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

type Greeter struct {
	Name string
}

func (g Greeter) Hello() string {
	return "Hello, " + g.Name
}

func main() {
	g := Greeter{Name: "Playlang"}
	fmt.Println(g.Hello())
}
`,
    coldStartHint: "First run may take 30–60s while Go downloads.",
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
    example: `nums <- 1:5
print("Hello, Playlang")
print(nums ^ 2)
`,
    coldStartHint: "First run may take 30–60s while R downloads.",
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
using System.Linq;

var numbers = new[] { 1, 2, 3, 4, 5 };
var total = numbers.Where(n => n % 2 == 1).Select(n => n * n).Sum(n => n);

Console.WriteLine("Hello, Playlang");
Console.WriteLine(total);
`,
    coldStartHint: "First run may take 30–90s while C# downloads.",
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
    example: `import java.util.stream.IntStream;

public class Main {
  public static void main(String[] args) {
    int total = IntStream.rangeClosed(1, 5).map(n -> n * n).sum();
    System.out.println("Hello, Playlang");
    System.out.println(total);
  }
}
`,
    coldStartHint: "First run may take 30–90s while Java downloads.",
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
#include <vector>

int main() {
  std::vector<int> nums = {1, 2, 3, 4, 5};
  std::cout << "Hello, Playlang" << std::endl;
  for (int n : nums) {
    std::cout << (n * n) << std::endl;
  }
}
`,
    coldStartHint: "First run may take 60–180s while C/C++ downloads.",
  },
  {
    id: "elixir",
    name: "Elixir",
    monacoLanguage: "elixir",
    engine: "Popcorn",
    version: "0.3.3",
    status: "available",
    guestNetwork: true,
    examplePath: "main.exs",
    example: `total =
  1..5
  |> Enum.map(&(&1 * &1))
  |> Enum.sum()

IO.puts("Hello, Playlang")
IO.puts(total)
`,
    coldStartHint: "First run may take 30–90s while Elixir downloads.",
  },
];

export function languageById(id: string): LanguageInfo | undefined {
  return LANGUAGES.find((language) => language.id === id);
}

export function availableLanguages(): LanguageInfo[] {
  return LANGUAGES.filter((language) => language.status === "available");
}
