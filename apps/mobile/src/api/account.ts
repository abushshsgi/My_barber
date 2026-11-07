import { apiJson } from "./client";

/** Akkauntni hozir o'chiradi. Keyingi telefon yoki Google kirishi yangi hisob ochadi. */
export function deleteMyAccount() {
  return apiJson<{ ok: boolean; code: string }>("/api/v1/users/me/delete/", {
    method: "POST",
  });
}
