/**
 * Under COEP (needed for Popcorn/AtomVM), cross-origin iframes are blocked unless
 * they send COEP themselves. CheerpJ's CDN `c.html` does not. Marking those
 * iframes `credentialless` allows them under `COEP: credentialless`.
 */
export function enableCredentiallessIframes(): void {
  if (typeof document === "undefined") return;
  const marked = new WeakSet<Element>();

  const mark = (el: Element) => {
    if (!(el instanceof HTMLIFrameElement) || marked.has(el)) return;
    marked.add(el);
    try {
      (el as HTMLIFrameElement & { credentialless?: boolean }).credentialless =
        true;
    } catch {
      // Older browsers without the attribute — CheerpJ may still fail under COEP.
    }
  };

  const originalCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function createElement(
    this: Document,
    tagName: string,
    options?: ElementCreationOptions,
  ): HTMLElement {
    const el = originalCreateElement.call(this, tagName, options);
    if (String(tagName).toLowerCase() === "iframe") mark(el);
    return el;
  } as typeof Document.prototype.createElement;

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof HTMLIFrameElement) mark(node);
        else if (node instanceof Element) {
          node.querySelectorAll("iframe").forEach(mark);
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.querySelectorAll("iframe").forEach(mark);
}
