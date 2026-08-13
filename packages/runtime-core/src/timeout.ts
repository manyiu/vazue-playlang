export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const MAX_OUTPUT_BYTES = 256 * 1024;

export function capOutput(text: string): { text: string; truncated: boolean } {
  const encoded = new TextEncoder().encode(text);
  if (encoded.byteLength <= MAX_OUTPUT_BYTES) {
    return { text, truncated: false };
  }
  const sliced = encoded.slice(0, MAX_OUTPUT_BYTES);
  return {
    text: new TextDecoder().decode(sliced) + "\n…(truncated)",
    truncated: true,
  };
}
