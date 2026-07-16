import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uz.mysaloon.app",
  appName: "MySaloon",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 600,
      backgroundColor: "#000000",
      showSpinner: false,
    },
  },
};

export default config;
