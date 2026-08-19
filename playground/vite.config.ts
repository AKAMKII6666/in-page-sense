import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const playgroundDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: playgroundDir,
  resolve: {
    alias: {
      "in-page-sense": path.resolve(playgroundDir, "../src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
