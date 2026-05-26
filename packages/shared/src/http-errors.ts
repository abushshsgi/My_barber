/** API javoblarini JSON/HTML ajratish va foydalanuvchiga tushunarli xabar berish. */

function firstString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && v.length > 0) return firstString(v[0]);
  return null;
}

type NonJsonBody = {
  _nonJson: true;
  _preview: string;
};

export function isNonJsonBody(body: unknown): body is NonJsonBody {
  return (
    !!body &&
    typeof body === "object" &&
    (body as NonJsonBody)._nonJson === true
  );
}

/** DRF / Django JSON xatosidan matn olish. */
export function formatApiErrorBody(body: unknown, fallback: string): string {
  if (isNonJsonBody(body)) return "";
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    const detail = firstString(obj.detail);
    if (detail) return detail;
    const nf = firstString(obj.non_field_errors);
    if (nf) return nf;
    for (const key of Object.keys(obj)) {
      if (key === "detail" || key === "non_field_errors") continue;
      const msg = firstString(obj[key]);
      if (msg) return `${key}: ${msg}`;
    }
  }
  return fallback;
}

export async function parseResponseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return { _nonJson: true, _preview: trimmed.slice(0, 800) } satisfies NonJsonBody;
  }
}

function hintFromPreview(preview: string, status: number): string | null {
  const lower = preview.toLowerCase();
  if (lower.includes("disallowedhost") || lower.includes("invalid http_host")) {
    return "Backend sozlamasi: API domeni ALLOWED_HOSTS ro‘yxatida yo‘q (Railway: DJANGO_ALLOWED_HOSTS=api.mysaloon.uz).";
  }
  if (lower.includes("<!doctype") || lower.includes("<html")) {
    if (status === 401) return "Email yoki parol noto‘g‘ri.";
    if (status === 400) {
      return "Server so‘rovni qabul qilmadi (400). API manzili va backend env o‘zgaruvchilarini tekshiring.";
    }
    if (status >= 500) return "Server vaqtincha ishlamayapti. Birozdan keyin qayta urinib ko‘ring.";
    if (status === 404) {
      return "API yo‘li topilmadi (404). Frontend eski bo‘lishi yoki noto‘g‘ri manzil bo‘lishi mumkin — VITE_API_URL=https://api.mysaloon.uz va yangi deployni tekshiring.";
    }
    return "Server JSON o‘rniga HTML sahifa qaytardi. API_URL (https://api.mysaloon.uz) va backend ishlayotganini tekshiring.";
  }
  return null;
}

function mapKnownDetail(detail: string): string | null {
  const lower = detail.toLowerCase();
  if (
    lower.includes("sartarosh") &&
    (lower.includes("mijoz") || lower.includes("barber_account"))
  ) {
    return "Bu email sartarosh akkaunti uchun. Barber panel: partner.mysaloon.uz";
  }
  if (lower.includes("mijoz akkaunt") && lower.includes("sartarosh panel")) {
    return "Bu email mijoz akkaunti uchun. Sayt: www.mysaloon.uz";
  }
  if (lower.includes("noto‘g‘ri email") || lower.includes("noto'g'ri email")) {
    return detail;
  }
  return null;
}

/** HTTP status + body bo‘yicha bitta tushunarli xabar (qizil alert uchun). */
export function formatHttpApiError(
  res: Response,
  body: unknown,
  fallback: string,
): string {
  if (isNonJsonBody(body)) {
    const hinted = hintFromPreview(body._preview, res.status);
    if (hinted) return hinted;
    return fallback;
  }

  const fromBody = formatApiErrorBody(body, "");
  if (fromBody) {
    return mapKnownDetail(fromBody) ?? fromBody;
  }

  if (res.status === 401) return "Email yoki parol noto‘g‘ri.";
  if (res.status === 403) return "Kirish rad etildi. To‘g‘ri ilova va hisob turini tanlang.";
  if (res.status === 429) return "Juda ko‘p urinish. Biroz kutib qayta urinib ko‘ring.";
  if (res.status >= 500) return "Server xatosi. Keyinroq qayta urinib ko‘ring.";
  if (res.status === 400) return "So‘rov noto‘g‘ri. Ma’lumotlarni tekshirib qayta yuboring.";

  return fallback || res.statusText || "Xatolik yuz berdi";
}

export function formatFetchError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) {
    return "Internet yoki API server bilan aloqa yo‘q. API manzilini va backend holatini tekshiring.";
  }
  if (msg.trim()) return msg;
  return fallback;
}
