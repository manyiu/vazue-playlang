export type CopyResult =
  | { ok: true }
  | { ok: false; reason: "denied" | "unsupported" };

export async function copyToClipboard(text: string): Promise<CopyResult> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch {
      return { ok: false, reason: "denied" };
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied ? { ok: true } : { ok: false, reason: "denied" };
  } catch {
    return { ok: false, reason: "unsupported" };
  }
}
