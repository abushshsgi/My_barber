import { apiFetch } from "@/lib/api";
import { normalizeEmail, parseJsonSafe } from "@/lib/auth-ui";
import { formatUzPhoneE164 } from "@/lib/phone";

export type FieldErrors = Partial<Record<"email" | "phone" | "password" | "detail", string>>;

export function parseFieldErrors(body: unknown): FieldErrors {
  const out: FieldErrors = {};
  if (!body || typeof body !== "object") return out;
  const obj = body as Record<string, unknown>;

  const detail = obj.detail;
  if (typeof detail === "string" && detail.trim()) {
    out.detail = detail.trim();
  } else if (Array.isArray(detail) && typeof detail[0] === "string") {
    out.detail = detail[0];
  }

  for (const key of ["email", "phone", "password"] as const) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) out[key] = val.trim();
    else if (Array.isArray(val) && typeof val[0] === "string") out[key] = val[0];
  }
  return out;
}

export async function checkBarberAvailability(input: {
  email?: string;
  phone?: string;
}): Promise<{ emailError: string | null; phoneError: string | null }> {
  const res = await apiFetch("/api/v1/auth/barber-check-availability/", {
    method: "POST",
    body: JSON.stringify({
      email: input.email ? normalizeEmail(input.email) : "",
      phone: input.phone ? formatUzPhoneE164(input.phone) : "",
    }),
  });
  const body = await parseJsonSafe(res);
  if (!res.ok) {
    const fields = parseFieldErrors(body);
    return {
      emailError: fields.email ?? fields.detail ?? "Tekshiruv amalga oshmadi.",
      phoneError: fields.phone ?? null,
    };
  }
  const data = body as {
    email_available?: boolean;
    phone_available?: boolean;
    hints?: string[];
  };
  const hints = data.hints ?? [];
  let emailError: string | null = null;
  let phoneError: string | null = null;
  if (input.email && data.email_available === false) {
    emailError = hints.find((h) => h.toLowerCase().includes("email")) ?? "Email band.";
  }
  if (input.phone && data.phone_available === false) {
    phoneError =
      hints.find((h) => h.toLowerCase().includes("telefon")) ??
      "Bu telefon boshqa akkauntda band.";
  } else if (input.phone && !data.phone_available && hints.length) {
    phoneError = hints.find((h) => !h.toLowerCase().includes("email")) ?? hints[0] ?? null;
  }
  return { emailError, phoneError };
}
