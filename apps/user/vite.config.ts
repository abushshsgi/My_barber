import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const salonRoot = path.resolve(appDir, "../salon-connect");

export default defineConfig({
  nitro: {
    preset: "vercel",
    // Lovable default serverDir (dist/server) breaks Vercel — needs functions/__server.func
    output: { serverDir: "dist/functions/__server.func" },
  },
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
