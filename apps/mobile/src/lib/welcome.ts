import AsyncStorage from "@react-native-async-storage/async-storage";

const WELCOME_SEEN_KEY = "mysaloon.welcome.seen";

/** Birinchi ochilishdagi Get Started ko'rilganmi. */
export async function getWelcomeSeen(): Promise<boolean> {
  const v = await AsyncStorage.getItem(WELCOME_SEEN_KEY);
  return v === "1";
}

export async function setWelcomeSeen(): Promise<void> {
  await AsyncStorage.setItem(WELCOME_SEEN_KEY, "1");
}
