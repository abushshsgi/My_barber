import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
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
