import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devApiTarget = env.DEV_API_TARGET?.trim() || "http://127.0.0.1:8000";

  return {
    server: {
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
    plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
    build: {
      outDir: "dist/client",
      emptyOutDir: true,
    },
  };
});
