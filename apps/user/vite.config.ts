import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const bridgeDir = path.dirname(fileURLToPath(import.meta.url));
const salonRoot = path.resolve(bridgeDir, "../salon-connect");
const userUiRoot = path.resolve(bridgeDir, "../../packages/user-ui/src");

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    root: salonRoot,
    resolve: {
      alias: [
        {
          find: "@",
          replacement: path.resolve(salonRoot, "src"),
        },
        {
          find: path.resolve(salonRoot, "src/styles.css"),
          replacement: path.resolve(bridgeDir, "bridge/styles-entry.css"),
        },
        {
          find: path.resolve(salonRoot, "src/components/UserLayout.tsx"),
          replacement: path.resolve(bridgeDir, "bridge/overrides/UserLayout.tsx"),
        },
        {
          find: path.resolve(salonRoot, "src/components/UserBottomNav.tsx"),
          replacement: path.resolve(bridgeDir, "bridge/overrides/UserBottomNav.tsx"),
        },
        {
          find: path.resolve(salonRoot, "src/components/SalonCard.tsx"),
          replacement: path.resolve(bridgeDir, "bridge/overrides/SalonCard.tsx"),
        },
        {
          find: "@mybarber/user-ui",
          replacement: userUiRoot,
        },
      ],
    },
  },
});
