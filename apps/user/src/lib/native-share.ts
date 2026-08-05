export type NativeShareInput = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

/** Web Share API. AbortError tashlanadi. */
export async function nativeShare(input: NativeShareInput): Promise<"shared" | "unsupported"> {
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
