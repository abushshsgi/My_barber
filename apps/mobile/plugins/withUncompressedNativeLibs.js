const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

/**
 * Load JNI from the APK (extractNativeLibs=false). Compressed .so + mmap
 * fails on many phones; extracted libs also fail 16 KB page-size devices.
 */
function withUncompressedNativeLibs(config) {
  return withAndroidManifest(config, (mod) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    app.$["android:extractNativeLibs"] = "false";
    const existing = String(app.$["tools:replace"] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!existing.includes("android:extractNativeLibs")) {
      existing.push("android:extractNativeLibs");
    }
    app.$["tools:replace"] = existing.join(",");
    const manifest = mod.modResults.manifest;
    if (manifest && manifest.$ && !manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }
    return mod;
  });
}

module.exports = withUncompressedNativeLibs;
