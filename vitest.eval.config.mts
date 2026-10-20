import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { include: ["tests/evals/**/*.eval.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "@emails": path.resolve(import.meta.dirname, "emails") } },
});
