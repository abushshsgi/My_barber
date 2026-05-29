import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: {
    preset: "vercel",
    output: { serverDir: "dist/functions/__server.func" },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
