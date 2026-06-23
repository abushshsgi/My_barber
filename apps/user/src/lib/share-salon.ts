import type { Salon } from "@/lib/mock-data";

export function salonPublicUrl(salonId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/salon/${salonId}`;
  }
  return `https://mysaloon.uz/salon/${salonId}`;
}

export type ShareSalonResult = "shared" | "copied";

export async function shareSalon(salon: Pick<Salon, "id" | "name" | "address">): Promise<ShareSalonResult> {
  const url = salonPublicUrl(salon.id);
  const text = salon.address ? `${salon.name} — ${salon.address}` : salon.name;

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: salon.name, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return "copied";
  }

  throw new Error("Share not supported");
}
