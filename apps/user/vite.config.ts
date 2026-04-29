import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(__dirname, "package.json"));
const sharedRoot = path.join(
  path.dirname(require.resolve("@mybarber/shared/package.json")),
  "src",
);

export default defineConfig({
  plugins: [TanStackRouterVite(), react(), tailwindcss(), tsconfigPaths()],
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
});

