import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { setupMonaco } from "./monaco-setup.ts";

setupMonaco();

type EditorPaneProps = {
  language: string;
  path: string;
  value: string;
  onChange: (value: string) => void;
};

function useMobileEditor(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => setMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return mobile;
}

export function EditorPane({ language, path, value, onChange }: EditorPaneProps) {
  const mobile = useMobileEditor();

  return (
    <Editor
      theme="vs-dark"
      language={language}
      path={path}
      value={value}
      onChange={(next) => onChange(next ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: mobile ? 16 : 14,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: mobile ? "on" : "off",
        padding: { top: 12 },
      }}
    />
  );
}
