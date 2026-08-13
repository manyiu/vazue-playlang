export type LanguageStatus = "available" | "coming" | "unavailable";

export type LanguageInfo = {
  id: string;
  name: string;
  monacoLanguage: string;
  engine: string;
  version: string;
  status: LanguageStatus;
  reason?: string;
  guestNetwork: boolean;
  examplePath: string;
  example: string;
};

export type RunRequest = {
  languageId: string;
  files: Record<string, string>;
  entrypoint?: string;
  stdin?: string;
  timeoutMs: number;
};

export type RunResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  timingMs: number;
  truncated?: boolean;
};

export type RuntimeCapabilities = {
  stdin: boolean;
  multiFile: boolean;
  packages: boolean;
};

export type RuntimeAdapter = {
  id: string;
  capabilities: RuntimeCapabilities;
  load: () => Promise<void>;
  run: (request: RunRequest) => Promise<RunResult>;
  dispose?: () => void;
};

export type SharePayload = {
  v: 1;
  languageId: string;
  files: Record<string, string>;
  entrypoint?: string;
};

export type ShareEncodeResult = {
  hash: string;
  bytes: number;
  status: "ok" | "warn" | "too_large";
};
