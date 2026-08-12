/** Profile tab ichidan Morph stack ekranlariga o‘tish. */
export function openMorphStack(
  navigation: { getParent?: () => { navigate: (name: string, params?: object) => void } | undefined },
  screen: "MorphHistory" | "MorphPaywall" | "MorphStudio" | "MorphCapture",
  params?: object,
): void {
  const parent = navigation.getParent?.();
  parent?.navigate("MorphTryOn", { screen, params });
}
