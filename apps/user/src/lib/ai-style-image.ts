async function imageUrlToBlob(url: string): Promise<Blob> {
  if (url.startsWith("data:")) {
    const res = await fetch(url);
    return res.blob();
  }
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) throw new Error("fetch failed");
  return res.blob();
}

function triggerAnchorDownload(objectUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

/**
 * Download try-on result to device Photos/Downloads gallery.
 * Prefers Web Share Level 2 (files) on mobile so the image lands in Photos.
 */
export async function downloadAiStyleImage(url: string, filename: string) {
  const blob = await imageUrlToBlob(url);
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return "shared" as const;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled" as const;
      }
      /* fall through to anchor download */
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    triggerAnchorDownload(objectUrl, filename);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
  return "downloaded" as const;
}

/**
 * Prefer sharing a page URL (viral link). Only share the image file when no pageUrl.
 */
export async function shareAiStyleImage(title: string, url: string, pageUrl?: string) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (pageUrl) {
        await navigator.share({ title, text: title, url: pageUrl });
        return "shared" as const;
      }
      const blob = await imageUrlToBlob(url);
      const file = new File([blob], "mybarber-style.jpg", { type: blob.type || "image/jpeg" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, files: [file] });
        return "shared" as const;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled" as const;
    }
  }

  if (pageUrl && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(`${title}\n${pageUrl}`);
    return "copied" as const;
  }

  throw new Error("share unsupported");
}

export async function shareAiStyleLink(title: string, pageUrl: string) {
  return shareAiStyleImage(title, pageUrl, pageUrl);
}
