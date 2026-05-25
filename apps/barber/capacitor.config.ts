import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uz.mysaloon.partner",
  appName: "MySaloon Partner",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 600,
      backgroundColor: "#F7F5F0",
      showSpinner: false,
    },
  },
};

export default config;
