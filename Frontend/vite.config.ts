import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vite configuration — MUST follow frontend.md §13.
// - React plugin enabled.
// - `@/*` path alias resolves to `src/*` so imports like `@/components/ui/card` work.
// - Dev server listens on :5173 (matches the PRD's frontend port) and proxies API calls
//   to the .NET backend on :5279 so the browser can call it without CORS preflights
//   during development. Backend still owns its own CORS policy for production.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:5279",
        changeOrigin: true,
        ws: true, // SignalR websockets
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
});
