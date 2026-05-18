import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@mybarber/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});
