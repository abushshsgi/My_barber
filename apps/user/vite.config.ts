import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api/v1": {
        target: process.env.DEV_API_TARGET ?? "http://127.0.0.1:8000",
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
