import { Capacitor } from "@capacitor/core";

export type NativeShareInput = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

/** Capacitor Share, keyin Web Share API. AbortError tashlanadi. */
export async function nativeShare(input: NativeShareInput): Promise<"shared" | "unsupported"> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: input.title,
        text: input.text,
        url: input.url,
        dialogTitle: input.dialogTitle ?? input.title,
      });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      if (err && typeof err === "object" && "message" in err) {
        const msg = String((err as { message: string }).message).toLowerCase();
        if (msg.includes("cancel") || msg.includes("abort")) {
          throw new DOMException("Share cancelled", "AbortError");
        }
      }
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    await navigator.share({
      title: input.title,
      text: input.text,
      url: input.url,
    });
    return "shared";
  }

  return "unsupported";
}
