import AsyncStorage from "@react-native-async-storage/async-storage";

function key(userId: number) {
  return `mysaloon.wallet.opened.${userId}`;
}

/** Mobil onboarding tugaganmi (web foydalanuvchilar balans/tx orqali skip). */
export async function isWalletOpened(userId: number): Promise<boolean> {
  const v = await AsyncStorage.getItem(key(userId));
  return v === "1";
}

export async function markWalletOpened(userId: number): Promise<void> {
  await AsyncStorage.setItem(key(userId), "1");
}
