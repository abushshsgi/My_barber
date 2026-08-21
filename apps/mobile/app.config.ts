import type { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Maps API key — Android native MapView uchun majburiy.
 * Lokal: apps/mobile/.env → EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
 * EAS: preview/production environment variable
 */
function mapsApiKey(): string {
  return (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey = mapsApiKey();

  return {
    ...config,
    name: "Mysaloon",
    slug: "mysaloon",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "mysaloon",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "uz.mysaloon.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Yaqin salonlarni ko'rsatish uchun joylashuvingiz kerak.",
        NSMicrophoneUsageDescription:
          "Morf AI bilan ovozli suhbat uchun mikrofon kerak.",
        ITSAppUsesNonExemptEncryption: false,
      },
      config: googleMapsApiKey
        ? { googleMapsApiKey }
        : undefined,
    },
    android: {
      package: "uz.mysaloon.app",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "RECORD_AUDIO"],
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      config: googleMapsApiKey
        ? { googleMaps: { apiKey: googleMapsApiKey } }
        : undefined,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-av",
        {
          microphonePermission:
            "Morf AI bilan ovozli suhbat uchun mikrofon kerak.",
        },
      ],
      "expo-image",
      "expo-asset",
      "expo-font",
      "expo-web-browser",
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Try-on va chek yuklash uchun galereyaga ruxsat kerak.",
          cameraPermission:
            "Yuz skani uchun kameraga ruxsat kerak.",
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Yaqin salonlarni ko'rsatish uchun joylashuvingiz kerak.",
        },
      ],
      googleMapsApiKey
        ? [
            "react-native-maps",
            {
              androidGoogleMapsApiKey: googleMapsApiKey,
              iosGoogleMapsApiKey: googleMapsApiKey,
            },
          ]
        : "react-native-maps",
      [
        "expo-build-properties",
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            useLegacyPackaging: true,
            // R8: expo-av references optional expo-modules types not always on classpath
            extraProguardRules: [
              "-dontwarn expo.modules.core.interfaces.services.KeepAwakeManager",
              "-dontwarn expo.modules.kotlin.types.AnyTypeProvider",
              "-dontwarn expo.modules.kotlin.types.LazyKType",
            ].join("\n"),
          },
        },
      ],
    ],
    extra: {
      apiUrl:
        process.env.EXPO_PUBLIC_API_URL?.trim() || "https://api.mysaloon.uz",
      googleClientId:
        process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
        "990469146793-ep627vhgbidpuojfrv0crlsh3a5o52tn.apps.googleusercontent.com",
      googleMapsApiKey: googleMapsApiKey || undefined,
      eas: {
        projectId: "7a541b52-f3c6-4bef-a463-8feaf27eba52",
      },
    },
  };
};
