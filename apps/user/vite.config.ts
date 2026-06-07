import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api/v1": {
        target: "https://api.mysaloon.uz",
        changeOrigin: true,
        secure: true,
      },
    },
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
