import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, Smartphone } from "lucide-react";
import { getBarberAccessToken } from "@/lib/api";

export const Route = createFileRoute("/check-email")({
  validateSearch: (raw: Record<string, unknown>) => ({
    email: typeof raw.email === "string" ? raw.email.trim() : "",
  }),
  head: () => ({ meta: [{ title: "Pochtangizni tekshiring — MySaloon Partner" }] }),
  component: CheckEmailPage,
});

function CheckEmailPage() {
  const { email } = Route.useSearch();
  const hasSession = typeof window !== "undefined" && Boolean(getBarberAccessToken());

  return (
    <div className="auth-viewport flex min-h-[100dvh] flex-col items-center justify-center bg-[#f4f4f5] px-5 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-7" />
        </div>
        <h1 className="font-heading text-xl font-semibold text-foreground">Pochtangizni tekshiring</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {email ? (
            <>
              <span className="font-medium text-foreground">{email}</span> manziliga tasdiqlash havolasi
              yuborildi.
            </>
          ) : (
            <>Email manzilingizga tasdiqlash havolasi yuborildi.</>
          )}{" "}
          Gmail yoki boshqa pochtangizni oching va <strong>«Email tasdiqlash»</strong> havolasini bosing.
        </p>

        <ul className="mt-6 space-y-2 text-left text-sm text-muted-foreground">
          <li>• Havola telefon yoki kompyuterdan ochilishi mumkin — ikkalasi ham ishlaydi.</li>
          <li>• Spam / Promotions papkasini ham tekshiring.</li>
          <li>• Havola ochilganda login sahifasi emas, tasdiqlash sahifasi chiqishi kerak.</li>
        </ul>

        <div className="mt-8 flex flex-col gap-2">
          {hasSession ? (
            <Link
              to="/barber/activation"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Aktivatsiyaga qaytish
            </Link>
          ) : (
            <Link
              to="/auth"
              className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
            >
              Kirish
            </Link>
          )}
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Smartphone className="size-3.5" />
            Mobil ilovadan ro&apos;yxatdan o&apos;tgan bo&apos;lsangiz, xatdagi birinchi (📱) havolani bosing.
          </p>
        </div>
      </div>
    </div>
  );
}
