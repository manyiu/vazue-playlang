/** True when the entry path should be compiled as C (not C++). */
export function isCSource(path: string): boolean {
  return /\.c$/i.test(path) && !/\.(cpp|cc|cxx|c\+\+)$/i.test(path);
}

/**
 * browsercc always invokes the clang++ driver and passes flags *after* the
 * input file, so `-x c` cannot force C mode. Omit `-std=c*` (rejected by the
 * C++ driver) and let the `.c` extension select the C language. C++ uses C++20
 * without exceptions (WASI limitation).
 */
export function compileFlags(path: string): string[] {
  if (isCSource(path)) {
    return [];
  }
  return ["-std=c++20", "-fno-exceptions"];
}
