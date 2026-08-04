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
  if (mode === "production" && !apiUrl?.trim()) {
    throw new Error(
      "Mobile production build requires VITE_API_URL or NEXT_PUBLIC_API_URL (e.g. https://api.mysaloon.uz).",
    );
  }

  const appDir = __dirname;
  const mobileRoot = path.resolve(appDir, "mobile");

  // Public Vite keys (already in production web bundle). Override via env when needed.
  const googleClientId =
    env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    "213512364034-95h09fmo8uiidbfgd66735hqucokn75a.apps.googleusercontent.com";
  const mapsApiKey =
    env.VITE_GOOGLE_MAPS_API_KEY?.trim() ||
    env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    "AIzaSyDGcZoBrXu2vT9DejECAOfCm7PXcIFUDac";

  return {
    root: mobileRoot,
    publicDir: path.resolve(appDir, "public"),
    define: {
      "import.meta.env.VITE_MOBILE_SPA": JSON.stringify("true"),
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
      "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(mapsApiKey),
    },
    plugins: [
      TanStackRouterVite({
        routesDirectory: path.resolve(appDir, "src/routes"),
        generatedRouteTree: path.resolve(appDir, "src/routeTree.gen.ts"),
      }),
      react(),
      tailwindcss(),
      tsconfigPaths(),
      // Capacitor WebView — PWA SW lag + katta precache; native da kerak emas.
      VitePWA({
        disable: true,
        injectRegister: false,
        registerType: "autoUpdate",
        includeAssets: [
          "brand-logo.png",
          "favicon.ico",
          "favicon-32.png",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
          "icon-512-maskable.png",
        ],
        manifest: {
          id: "/",
          name: "MySaloon",
          short_name: "MySaloon",
          description: "Online salon va sartaroshxona bron platformasi",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          lang: "uz",
          icons: [
            { src: "icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@mybarber/shared": path.resolve(appDir, "../../packages/shared/src"),
      },
    },
    build: {
      outDir: path.resolve(appDir, "dist/client"),
      emptyOutDir: true,
      cssCodeSplit: true,
      sourcemap: false,
      chunkSizeWarningLimit: 3500,
    },
  };
});
