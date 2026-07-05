async function imageUrlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return res.blob();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("fetch failed");
  return res.blob();
}

export async function downloadAiStyleImage(url: string, filename: string) {
  const blob = await imageUrlToBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export async function shareAiStyleImage(title: string, url: string, pageUrl?: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const blob = await imageUrlToBlob(url);
      const file = new File([blob], "mybarber-style.jpg", { type: blob.type || "image/jpeg" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return "shared" as const;
      }
      if (pageUrl) {
        await navigator.share({ title, text: title, url: pageUrl });
        return "shared" as const;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
    }
  }

  if (pageUrl && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(pageUrl);
    return "copied" as const;
  }

  throw new Error("share unsupported");
}
