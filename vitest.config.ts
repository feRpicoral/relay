import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // Include worker/* so any future worker-side unit tests land in CI. The
    // worker entry itself isn't tested (it boots a LiveKit agent on import),
    // but extracted helpers like tool-instrumentation.ts can be.
    include: ["src/**/*.{test,spec}.ts", "worker/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    globals: true,
  },
});
