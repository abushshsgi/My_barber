import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const salonRoot = path.resolve(appDir, "../salon-connect");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    root: salonRoot,
    resolve: {
      alias: {
        "@": path.resolve(salonRoot, "src"),
      },
    },
  },
});
