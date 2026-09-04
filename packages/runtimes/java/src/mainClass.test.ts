import { describe, expect, it } from "vitest";
import { deriveMainClass } from "./mainClass.ts";
import {
  CHEERPJ_LOADER_URL,
  CHEERPJ_TOOLS_CLASSPATH,
  JAVA_LANGUAGE_VERSION,
} from "./versions.ts";

describe("deriveMainClass", () => {
  it("uses the file stem without a package", () => {
    expect(deriveMainClass("Main.java", "public class Main {}")).toBe("Main");
  });

  it("strips nested path segments", () => {
    expect(deriveMainClass("src/Hello.java", "class Hello {}")).toBe("Hello");
  });

  it("prefixes the package declaration", () => {
    expect(
      deriveMainClass(
        "Hello.java",
        "package demo.app;\npublic class Hello {\n}\n",
      ),
    ).toBe("demo.app.Hello");
  });

  it("ignores package mentions that are not a declaration", () => {
    expect(
      deriveMainClass(
        "Main.java",
        '// package ignored;\npublic class Main {}\n',
      ),
    ).toBe("Main");
  });
});

describe("CheerpJ credentialless iframes", () => {
  it("marks only CheerpJ CDN frames, not the JS sandbox or srcdoc", async () => {
    const { isCheerpJIframeSrc } = await import("./credentiallessIframes.ts");
    expect(isCheerpJIframeSrc("https://cjrtnc.leaningtech.com/4.3/c.html")).toBe(
      true,
    );
    expect(isCheerpJIframeSrc("https://playlang.vazue.com/js-sandbox.html")).toBe(
      false,
    );
    expect(isCheerpJIframeSrc("")).toBe(false);
  });

  it("sets credentialless before applying a CheerpJ iframe src", async () => {
    const order: string[] = [];
    const iframe = {
      credentialless: false,
      src: "",
    } as HTMLIFrameElement & { credentialless: boolean };

    Object.defineProperty(iframe, "credentialless", {
      configurable: true,
      get() {
        return false;
      },
      set() {
        order.push("credentialless");
      },
    });

    const { markCredentialless, isCheerpJIframeSrc } = await import(
      "./credentiallessIframes.ts"
    );
    const src = "https://cjrtnc.leaningtech.com/4.3/c.html";
    expect(isCheerpJIframeSrc(src)).toBe(true);
    markCredentialless(iframe);
    order.push("src");
    expect(order).toEqual(["credentialless", "src"]);
  });
});

describe("CheerpJ pins", () => {
  it("loads CheerpJ 4.3 from the Community License CDN", () => {
    expect(CHEERPJ_LOADER_URL).toBe(
      "https://cjrtnc.leaningtech.com/4.3/loader.js",
    );
  });

  it("exposes tools.jar on the CheerpJ /app mount with /files output", () => {
    expect(CHEERPJ_TOOLS_CLASSPATH).toBe("/app/tools.jar:/files/");
  });

  it("advertises Java 17", () => {
    expect(JAVA_LANGUAGE_VERSION).toBe("17");
  });
});
