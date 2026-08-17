import { CHEERPJ_LOADER_URL } from "./versions.ts";

const CHEERPJ_ORIGIN = new URL(CHEERPJ_LOADER_URL).origin;

let enabled = false;

export function isCheerpJIframeSrc(src: string): boolean {
  if (!src) return false;
  try {
    return new URL(src, "https://playlang.vazue.com").origin === CHEERPJ_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Under COEP (needed for Popcorn/AtomVM), cross-origin iframes are blocked unless
 * they send COEP themselves. CheerpJ's CDN `c.html` does not. Mark only those
 * iframes `credentialless` — never the JS sandbox or Popcorn srcdoc frame.
 */
export function enableCredentiallessIframes(): void {
  if (enabled || typeof document === "undefined") return;
  enabled = true;
  const marked = new WeakSet<Element>();

  const mark = (el: Element) => {
    if (!(el instanceof HTMLIFrameElement) || marked.has(el)) return;
    if (!isCheerpJIframeSrc(el.src)) return;
    marked.add(el);
    try {
      (el as HTMLIFrameElement & { credentialless?: boolean }).credentialless =
        true;
    } catch {
      // Older browsers without the attribute — CheerpJ may still fail under COEP.
    }
  };

  const originalSetAttribute = HTMLIFrameElement.prototype.setAttribute;
  HTMLIFrameElement.prototype.setAttribute = function setAttribute(
    name: string,
    value: string,
  ) {
    originalSetAttribute.call(this, name, value);
    if (name.toLowerCase() === "src") mark(this);
  };

  const srcDescriptor = Object.getOwnPropertyDescriptor(
    HTMLIFrameElement.prototype,
    "src",
  );
  if (srcDescriptor?.get && srcDescriptor.set) {
    const { get, set } = srcDescriptor;
    Object.defineProperty(HTMLIFrameElement.prototype, "src", {
      configurable: true,
      enumerable: srcDescriptor.enumerable,
      get() {
        return get.call(this);
      },
      set(value: string) {
        set.call(this, value);
        mark(this);
      },
    });
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof HTMLIFrameElement) {
        mark(record.target);
      }
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement) mark(node);
        else if (node instanceof Element) {
          node.querySelectorAll("iframe").forEach(mark);
        }
      });
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });
  document.querySelectorAll("iframe").forEach(mark);
}
