import i18n from "../i18n/config";

const NETWORK_RE =
  /unknownhostexception|no address associated with hostname|enotfound|getaddrinfo|network request failed|failed to fetch|internet|dns/i;

const TECH_API_RE =
  /could not satisfy|not acceptable|accept header|unsupported media type|parse error|expecting value|json parse|<html|traceback|integrityerror|operationalerror|disallowedhost/i;

const GATEWAY_RE =
  /application failed to respond|bad gateway|proxy_failed|upstream_timeout|gateway timeout|service unavailable|resource exhausted|too many requests/i;

/** DRF/HTML/stacktrace kabi texnik matnni foydalanuvchi tiliga. */
export function sanitizeDisplayError(message: string, apiBase?: string): string {
  const raw = message.trim();
  const cleaned = raw.replace(/^API\s+\d+:\s*/i, "").trim();
  const probe = `${raw} ${cleaned}`;

  if (!cleaned) return i18n.t("errors.load");

  if (NETWORK_RE.test(probe)) return i18n.t("errors.network");
  if (/timeout|abort/i.test(probe) && !/qayta urin/i.test(cleaned)) {
    return i18n.t("errors.server");
  }
  if (/API\s+406\b/i.test(raw) || TECH_API_RE.test(probe)) {
    return i18n.t("errors.aiUnavailable");
  }
  if (GATEWAY_RE.test(probe) || /\b(429|502|503|504)\b/.test(raw)) {
    return i18n.t("errors.server");
  }
  if (/java\.|exception|at com\.|at java\./i.test(probe)) {
    return i18n.t("errors.network");
  }
  if (apiBase && raw.includes(apiBase)) {
    return raw.replace(/\s*\([^)]*https?:\/\/[^)]+\)\s*$/i, "").trim() || i18n.t("errors.load");
  }
  return cleaned;
}

/** RN/Android fetch xatolarini foydalanuvchi tiliga. */
export function friendlyNetworkError(err: unknown, apiBase?: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return sanitizeDisplayError(raw, apiBase);
}
