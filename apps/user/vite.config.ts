import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "package.json"));
const sharedRoot = path.join(
  path.dirname(require.resolve("@mybarber/shared/package.json")),
  "src",
);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const apiUrl = env.VITE_API_URL || env.NEXT_PUBLIC_API_URL;
  if (mode === "production" && !apiUrl?.trim()) {
    throw new Error(
      "Production build requires VITE_API_URL or NEXT_PUBLIC_API_URL in .env.production (e.g. https://api.mysaloon.uz).",
    );
  }

  return {
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
          name: "MySaloon",
          short_name: "MySaloon",
          description: "Salon va sartaroshlarni toping, onlayn band qiling",
          theme_color: "#171512",
          background_color: "#171512",
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
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/],
        },
      }),
    ],
    resolve: {
      alias: [
        {
          find: /^@\/lib\/(.*)$/,
          replacement: `${sharedRoot}/$1`,
        },
        {
          find: /^@\/types\/?(.*)$/,
          replacement: `${path.join(sharedRoot, "types")}/$1`,
        },
      ],
    },
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
    },
  };
});
