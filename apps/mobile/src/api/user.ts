import { Platform } from "react-native";
import { apiJson, apiList, qs } from "./client";

export type ApiUser = {
  id: number;
  email: string;
  display_email?: string;
  email_verified?: boolean;
  phone?: string | null;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  region?: string;
  birth_year?: number | null;
  age?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  onboarding_completed?: boolean;
  avatar?: string | null;
  has_password?: boolean;
  sign_in_method?: "google" | "phone";
  gender?: "male" | "female" | null;
  require_profile_location?: boolean;
};

export type UpdateMePayload = Partial<
  Pick<
    ApiUser,
    | "first_name"
    | "last_name"
    | "full_name"
    | "phone"
    | "region"
    | "birth_year"
    | "latitude"
    | "longitude"
    | "onboarding_completed"
    | "gender"
  >
>;

export async function updateMe(data: UpdateMePayload): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export type ApiWallet = {
  balance: number | string;
  wallet_number?: string;
  card?: {
    cardholder_name: string;
    card_display: string;
    issued_at: string;
  };
  created_at?: string;
};

export type ApiBooking = {
  id: number;
  status: string;
  start_at?: string;
  salon_name?: string;
};

export type ApiNotification = {
  id: number;
  title: string;
  body?: string;
  message?: string;
  created_at: string;
  is_read?: boolean;
  read?: boolean;
};

export async function fetchMe(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/");
}

export async function fetchWallet(): Promise<ApiWallet> {
  return apiJson<ApiWallet>("/api/v1/wallet/me/");
}

export async function fetchBookings(): Promise<ApiBooking[]> {
  return apiList<ApiBooking>(`/api/v1/bookings/${qs({ page_size: 50 })}`);
}

export async function fetchNotifications(): Promise<ApiNotification[]> {
  return apiList<ApiNotification>(`/api/v1/notifications/${qs({ page_size: 50 })}`);
}

export async function fetchFavoriteSalonIds(): Promise<unknown[]> {
  return apiList(`/api/v1/favorites/salons/${qs({ page_size: 100 })}`);
}

export async function sendEmailVerificationCode(email: string): Promise<{
  detail: string;
  email: string;
  debug_code?: string;
}> {
  return apiJson("/api/v1/users/me/email/send-code/", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function verifyEmailCode(code: string): Promise<{ detail: string; user: ApiUser }> {
  return apiJson("/api/v1/users/me/email/verify/", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function displayName(user: ApiUser | null): string {
  if (!user) return "Mehmon";
  const full = user.full_name?.trim();
  if (full) return full;
  const parts = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return parts || user.email?.split("@")[0] || "Foydalanuvchi";
}

const NAME_FALLBACKS = new Set(["mehmon", "foydalanuvchi", "guest", "user", "mysaloon"]);

/** Farhod Ergashev → FE, Muhammad → M, ism yo'q → M. */
export function initials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned || NAME_FALLBACKS.has(cleaned.toLowerCase())) return "M";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  if (parts.length === 1) return first.toUpperCase() || "M";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export async function uploadMyAvatar(file: {
  uri: string;
  name: string;
  type: string;
  blob?: Blob;
}): Promise<ApiUser> {
  const body = new FormData();
  if (file.blob) {
    body.append("avatar", file.blob, file.name);
  } else if (Platform.OS === "web") {
    const res = await fetch(file.uri);
    const blob = await res.blob();
    const typed = blob.type ? blob : new Blob([blob], { type: file.type });
    body.append("avatar", typed, file.name);
  } else {
    body.append("avatar", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  return apiJson<ApiUser>("/api/v1/users/me/", { method: "PATCH", body });
}

export async function clearMyAvatar(): Promise<ApiUser> {
  return apiJson<ApiUser>("/api/v1/users/me/", {
    method: "PATCH",
    body: JSON.stringify({ avatar: null }),
  });
}

export function formatSom(amount: number | string): string {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!Number.isFinite(n)) return "0 so'm";
  return `${Math.round(n).toLocaleString("uz-UZ")} so'm`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const days = Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
  if (days <= 0) return "Bugun";
  if (days === 1) return "1 kun";
  return `${days} kun`;
}
