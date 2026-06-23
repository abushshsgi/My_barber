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
      "/covers/pexels": {
        target: "https://images.pexels.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => {
          const match = path.match(/^\/covers\/pexels\/(\d+)/);
          if (!match) return path;
          const id = match[1];
          const width = new URL(path, "http://localhost").searchParams.get("w") ?? "800";
          return `/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
        },
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
