import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      shared: path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: ":memory:",
    },
  },
});
