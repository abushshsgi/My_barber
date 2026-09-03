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
    // Reanimated 4 + worklets — faqat New Architecture.
    newArchEnabled: true,
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
      googleServicesFile: "./google-services.json",
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
        "expo-navigation-bar",
        {
          appearance: "light",
          behavior: "overlay-pan",
          visibility: "show",
          position: "absolute",
        },
      ],
      "./plugins/withUncompressedNativeLibs",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#000000",
          image: "./assets/splash-icon.png",
          imageWidth: 220,
        },
      ],
      [
        "expo-audio",
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
      "@react-native-google-signin/google-signin",
      [
        "expo-camera",
        {
          cameraPermission:
            "Mahsulot tarkibini skan qilish uchun kamera kerak.",
          recordAudioAndroid: false,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "Try-on va chek yuklash uchun galereyaga ruxsat kerak.",
          cameraPermission:
            "Yuz skani va mahsulot skani uchun kameraga ruxsat kerak.",
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
            // Uncompressed .so + extractNativeLibs=false (plugin) —
            // compressed JNI dlopen crash; extracted libs fail 16 KB pages.
            enableMinifyInReleaseBuilds: false,
            enableShrinkResourcesInReleaseBuilds: false,
            useLegacyPackaging: false,
            buildArchs: ["armeabi-v7a", "arm64-v8a"],
            extraProguardRules: [
              "-keep class expo.modules.** { *; }",
              "-keep class com.facebook.react.** { *; }",
              "-keep class com.facebook.hermes.** { *; }",
              "-keep class com.swmansion.reanimated.** { *; }",
              "-keep class com.swmansion.worklets.** { *; }",
              "-keep class com.swmansion.rnscreens.** { *; }",
              "-keep class com.swmansion.gesturehandler.** { *; }",
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
        // Web OAuth client (client_type 3) — Android client browser OAuth da 400 beradi.
        "990469146793-jtjdkj187hmn98r3snfqfuiqnd3ctjui.apps.googleusercontent.com",
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
        "990469146793-tkfiilj8078mrqhovup9l19qv6pce857.apps.googleusercontent.com",
      googleMapsApiKey: googleMapsApiKey || undefined,
      eas: {
        projectId: "7a541b52-f3c6-4bef-a463-8feaf27eba52",
      },
    },
  };
};
