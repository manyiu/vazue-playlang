import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setupMonaco } from "./monaco-setup.ts";

setupMonaco();
import "./index.css";
import { App } from "./App.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
