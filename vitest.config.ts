import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Same "@/*" alias as tsconfig paths, so src/lib modules can import each other at runtime in tests.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node" },
});
