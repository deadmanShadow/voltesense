import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Entry point — MUST (frontend.md §13).
// - React 18 concurrent root API.
// - StrictMode enabled in dev for catching side-effect issues early.
// - We use a non-null assertion on getElementById("root") because the index.html
//   template guarantees the element exists at boot time; an assertion here is
//   safer than a silent fallback.
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root container #root not found in index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
