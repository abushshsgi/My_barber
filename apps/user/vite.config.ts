import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const appDir = path.dirname(fileURLToPath(import.meta.url));

function readBuildId() {
  const file = path.join(appDir, ".build-id");
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  return "dev";
}

export default defineConfig({
  define: {
    __APP_BUILD_ID__: JSON.stringify(readBuildId()),
  },
  nitro: {
    preset: "vercel",
    output: {
      dir: "dist",
      serverDir: "dist/functions/__server.func",
      publicDir: "dist/static",
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
