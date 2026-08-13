import Editor from "@monaco-editor/react";
import { setupMonaco } from "./monaco-setup.ts";

setupMonaco();

type EditorPaneProps = {
  language: string;
  path: string;
  value: string;
  onChange: (value: string) => void;
};

export function EditorPane({ language, path, value, onChange }: EditorPaneProps) {
  return (
    <Editor
      theme="vs-dark"
      language={language}
      path={path}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 12 },
      }}
    />
  );
}
