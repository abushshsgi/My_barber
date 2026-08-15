import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "pending_referral_code_v1";

export async function setPendingReferralCode(code: string): Promise<void> {
  const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  if (!cleaned) {
    await AsyncStorage.removeItem(KEY);
    return;
  }
  await AsyncStorage.setItem(KEY, cleaned);
}

export async function getPendingReferralCode(): Promise<string | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw?.trim() || null;
}

export async function clearPendingReferralCode(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export async function consumePendingReferralCode(): Promise<string | undefined> {
  const code = await getPendingReferralCode();
  if (code) await clearPendingReferralCode();
  return code || undefined;
}
