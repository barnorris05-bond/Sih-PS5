import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@evidencegraph/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@evidencegraph/engine": path.resolve(__dirname, "packages/engine/src/index.ts"),
      "@evidencegraph/fixtures": path.resolve(__dirname, "packages/fixtures/src/index.ts"),
    },
  },
  test: {
    include: ["packages/*/src/**/*.test.ts"],
    environment: "node",
    globals: false,
  },
});
