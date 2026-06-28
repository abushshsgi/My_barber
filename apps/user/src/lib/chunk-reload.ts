const CHUNK_RELOAD_KEY = "mysaloon-chunk-reload";

export function isChunkLoadError(reason: unknown): boolean {
  const message =
    reason instanceof Error
      ? `${reason.message}\n${reason.stack ?? ""}`
      : typeof reason === "string"
        ? reason
        : "";
  return (
    /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk .* failed|error loading dynamically imported module|disallowed MIME type|text\/html.*module script|can't access property "component"|\.component.*undefined/i.test(
      message,
    )
  );
}

export function reloadForChunkError(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return false;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  const url = new URL(window.location.href);
  url.searchParams.set("_chunk", Date.now().toString(36));
  window.location.replace(url.toString());
  return true;
}

function isAssetChunkFailure(event: ErrorEvent): boolean {
  const msg = event.message || "";
  if (
    /disallowed MIME type|Loading module .* failed|Importing a module script failed|Failed to fetch dynamically imported module/i.test(
      msg,
    )
  ) {
    return true;
  }
  const target = event.target;
  if (target instanceof HTMLScriptElement && target.src.includes("/assets/")) {
    return true;
  }
  if (
    target instanceof HTMLLinkElement &&
    target.rel === "modulepreload" &&
    target.href.includes("/assets/")
  ) {
    return true;
  }
  return false;
}

/** React mountdan oldin chunk xatolarida bir marta reload. */
export function installChunkReloadGuard() {
  if (typeof window === "undefined") return;

  window.addEventListener(
    "error",
    (event) => {
      if (!isAssetChunkFailure(event)) return;
      event.preventDefault();
      reloadForChunkError();
    },
    true,
  );

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadForChunkError();
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    reloadForChunkError();
  });
}
