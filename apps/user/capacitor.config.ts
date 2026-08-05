import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "uz.mysaloon.app",
  appName: "MySaloon",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
  },
  android: {
    backgroundColor: "#ffffff",
  },
  plugins: {
    SplashScreen: {
      // Qisqa native splash — auto-hide; JS ham hide qiladi (qotib qolmasin).
      launchShowDuration: 400,
      launchAutoHide: true,
      launchFadeOutDuration: 200,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
    StatusBar: {
      overlaysWebView: true,
      style: "LIGHT",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
