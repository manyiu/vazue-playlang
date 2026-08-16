/** Minimal CheerpJ globals used by the Java adapter. */
export type CheerpJInitOptions = {
  status?: "splash" | "none" | "default";
};

export type CheerpJApi = {
  cheerpjInit: (options?: CheerpJInitOptions) => Promise<void>;
  cheerpjRunMain: (
    className: string,
    classPath: string,
    ...args: string[]
  ) => Promise<number>;
  cheerpjCreateDisplay: (
    width: number,
    height: number,
    parent?: HTMLElement | null,
  ) => void;
  cheerpOSAddStringFile?: (path: string, data: string | Uint8Array) => void;
  cheerpjAddStringFile?: (path: string, data: string | Uint8Array) => void;
  cjFileBlob?: (path: string) => Promise<Blob>;
};

export function cheerpj(): CheerpJApi {
  return globalThis as unknown as CheerpJApi;
}
