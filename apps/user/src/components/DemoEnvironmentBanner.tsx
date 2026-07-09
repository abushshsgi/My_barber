import { isDemoHostname } from "@mybarber/shared/demo-env";

export function DemoEnvironmentBanner() {
  if (typeof window === "undefined" || !isDemoHostname(window.location.hostname)) {
    return null;
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950">
      Demo muhit — faqat namoyish uchun. Ma&apos;lumotlar haqiqiy emas.
    </div>
  );
}
