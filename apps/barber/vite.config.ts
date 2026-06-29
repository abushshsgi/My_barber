import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiUrl = env.VITE_API_URL || env.NEXT_PUBLIC_API_URL;
  const isMobileSpa = env.VITE_MOBILE_SPA === "true";
  if (mode === "production" && !apiUrl?.trim() && isMobileSpa) {
    throw new Error(
      "Mobile production build requires VITE_API_URL or NEXT_PUBLIC_API_URL in .env.production (e.g. https://api.mysaloon.uz).",
    );
  }

  const devApiTarget = env.DEV_API_TARGET?.trim() || "http://127.0.0.1:8000";

  return {
    server: {
      port: 3003,
      host: true,
      proxy: {
        "/api/v1": {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/media": {
          target: devApiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      TanStackRouterVite(),
      react(),
      tailwindcss(),
      tsconfigPaths(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: [
          "favicon.ico",
          "favicon-32.png",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
          "icon-512-maskable.png",
        ],
        manifest: {
          id: "/",
          name: "MySaloon Partner",
          short_name: "Partner",
          description: "Sartaroshlar uchun bookinglar, mijozlar va daromadlarni boshqarish paneli",
          theme_color: "#F7F5F0",
          background_color: "#F7F5F0",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          lang: "uz",
          icons: [
            {
              src: "icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "icon-512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,woff,webmanifest}"],
          globIgnores: ["**/version.json"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/assets\//, /\.(?:js|css|map)$/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    resolve: {
      alias: {
        "@mybarber/shared": path.resolve(__dirname, "../../packages/shared/src"),
      },
    },
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
    },
  };
});
