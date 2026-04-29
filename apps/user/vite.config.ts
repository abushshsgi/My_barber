import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: /^@\/lib\/(.*)$/,
        replacement: `${path.resolve(__dirname, "../../packages/shared/src")}/$1`,
      },
      {
        find: /^@\/types\/?(.*)$/,
        replacement: `${path.resolve(__dirname, "../../packages/shared/src/types")}/$1`,
      },
    ],
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
});

