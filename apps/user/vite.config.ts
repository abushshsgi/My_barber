import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    router: {
      autoCodeSplitting: true,
    },
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("firebase")) return "vendor-firebase";
            if (id.includes("framer-motion")) return "vendor-motion";
            if (id.includes("@mediapipe")) return "vendor-mediapipe";
            if (id.includes("@react-three") || /[/\\]three[/\\]/.test(id)) return "vendor-three";
            if (id.includes("recharts")) return "vendor-recharts";
            if (id.includes("lucide-react")) return "vendor-lucide";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("@tanstack/react-query") || id.includes("@tanstack/query-core")) {
              return "vendor-query";
            }
            if (id.includes("@tanstack/react-router") || id.includes("@tanstack/router-core")) {
              return "vendor-router";
            }
            if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
            if (id.includes("@zxing")) return "vendor-zxing";
            if (id.includes("@react-oauth")) return "vendor-google-oauth";
          },
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api/v1": {
        target: process.env.DEV_API_TARGET ?? "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: true,
      },
      "/media": {
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
    preset: "node-server",
  },
});
