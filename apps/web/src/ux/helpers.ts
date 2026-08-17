import type { LanguageInfo, SharePayload } from "@playlang/runtime-core";

export const STDIN_LANGUAGE_IDS = new Set(["python", "go", "cpp"]);

export const OUTPUT_HEIGHT_KEY = "playlang-output-height";
export const ONBOARDING_KEY = "playlang-onboarded";

export function hasUnsavedEdits(
  source: string,
  language: LanguageInfo,
): boolean {
  return source !== language.example;
}

export function runModKeyLabel(): string {
  if (typeof navigator !== "undefined") {
    return /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl";
  }
  return "Ctrl";
}

export function snapshotPayload(payload: SharePayload): string {
  return JSON.stringify(payload);
}

export function supportsStdin(languageId: string): boolean {
  return STDIN_LANGUAGE_IDS.has(languageId);
}

export function readOutputHeight(): number | null {
  try {
    const raw = sessionStorage.getItem(OUTPUT_HEIGHT_KEY);
    if (!raw) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= 120 ? value : null;
  } catch {
    return null;
  }
}

export function writeOutputHeight(height: number): void {
  try {
    sessionStorage.setItem(OUTPUT_HEIGHT_KEY, String(Math.round(height)));
  } catch {
    // ignore storage errors
  }
}

export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboarded(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignore storage errors
  }
}
