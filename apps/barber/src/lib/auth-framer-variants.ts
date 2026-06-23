import type { AuthAccent, AuthDesktopVariant } from "@/lib/auth-desktop-variant";

export type FramerVariantConfig = {
  accent: AuthAccent;
  badge: string;
  headline: string;
  highlight: string;
  highlightClass: string;
  subline: string;
  bullets: string[];
  stat: { value: string; label: string };
  bgLeft: string;
  textMain: string;
  glowColor: string;
  orbPosition?: string;
};

/** Framer split — marketing matn va ranglar. */
export const FRAMER_VARIANT_CONFIG: Record<AuthDesktopVariant, FramerVariantConfig> = {
  "framer-ember": {
    accent: "orange",
    badge: "Salon egalari uchun",
    headline: "Bronlarni qo'lda emas,",
    highlight: "avtomat qiling.",
    highlightClass: "text-orange-500",
    subline:
      "MySaloon Partner — jadval, mijozlar va to'lovlar bitta panelda. Birinchi haftada vaqtingiz 5 soatga qisqaradi.",
    bullets: ["Onlayn bron 24/7", "SMS eslatmalar", "Daromad hisoboti"],
    stat: { value: "18k+", label: "oylik bron" },
    bgLeft: "bg-[#fff7ed]",
    textMain: "text-zinc-900",
    glowColor: "#fb923c",
  },
  "framer-violet": {
    accent: "violet",
    badge: "Partner kabineti",
    headline: "Saloningizni",
    highlight: "keyingi darajaga.",
    highlightClass: "text-violet-600",
    subline:
      "Mustaqil barber yoki tarmoq — bitta platforma. Mijozlar ilovadan bron qiladi, siz faqat xizmat ko'rsatasiz.",
    bullets: ["4 yo'l: owner, ishchi, mybarber", "Tez onboarding", "Mobil va desktop"],
    stat: { value: "2.4k+", label: "faol partner" },
    bgLeft: "bg-[#f5f3ff]",
    textMain: "text-zinc-900",
    glowColor: "#a78bfa",
  },
  "framer-emerald": {
    accent: "emerald",
    badge: "O'sish uchun",
    headline: "Bo'sh vaqt kamayadi,",
    highlight: "daromad oshadi.",
    highlightClass: "text-emerald-600",
    subline:
      "No-show kamayadi, jadval to'ladi. MySaloon mijozlarga qulay vaqt taklif qiladi — siz esa faqat ishga e'tibor qiling.",
    bullets: ["Smart jadval", "Takroriy mijozlar", "Reyting va sharhlar"],
    stat: { value: "−32%", label: "no-show" },
    bgLeft: "bg-[#ecfdf5]",
    textMain: "text-zinc-900",
    glowColor: "#34d399",
  },
  "framer-coral": {
    accent: "rose",
    badge: "Premium salon",
    headline: "Mijozlar qaytadi —",
    highlight: "har hafta.",
    highlightClass: "text-rose-500",
    subline:
      "Chiroyli profil, aniq narxlar va tez bron — mijoz ishonchi oshadi. Raqobatchilardan ajralib turing.",
    bullets: ["Salon vitrinasi", "Xizmatlar va narxlar", "Ijtimoiy ulashish"],
    stat: { value: "4.8★", label: "o'rtacha reyting" },
    bgLeft: "bg-[#fff1f2]",
    textMain: "text-zinc-900",
    glowColor: "#fb7185",
  },
  "framer-midnight": {
    accent: "indigo",
    badge: "Professional",
    headline: "Tungi smena ham",
    highlight: "nazorat ostida.",
    highlightClass: "text-indigo-400",
    subline:
      "Qorong'u rejim, aniq raqamlar, tez kirish. Kechki ishlaydigan barberlar va 24/7 salonlar uchun qulay panel.",
    bullets: ["Tez login", "Xavfsiz sessiya", "Barcha qurilmalar"],
    stat: { value: "99.9%", label: "uptime" },
    bgLeft: "bg-[#0f0f12]",
    textMain: "text-white",
    glowColor: "#6366f1",
    orbPosition: "left-1/4",
  },
  "framer-sky": {
    accent: "cyan",
    badge: "Erkin jadval",
    headline: "Vaqt — sizniki,",
    highlight: "tartib — bizniki.",
    highlightClass: "text-cyan-600",
    subline:
      "Dam olish kunlari, tushlik tanaffusi, maxsus slotlar — hammasi bir necha bosishda. Mijozlar faqat ochiq vaqtni ko'radi.",
    bullets: ["Ish vaqti qoidalari", "Dam olish kunlari", "Slot boshqaruvi"],
    stat: { value: "5 daq", label: "sozlash vaqti" },
    bgLeft: "bg-[#ecfeff]",
    textMain: "text-zinc-900",
    glowColor: "#22d3ee",
  },
  "framer-gold": {
    accent: "orange",
    badge: "Daromad",
    headline: "Raqamlarni ko'ring,",
    highlight: "qaror qiling.",
    highlightClass: "text-amber-600",
    subline:
      "Kunlik, haftalik va oylik hisobotlar. Qaysi xizmat ko'p sotiladi, qaysi barber yuklangan — hammasi aniq.",
    bullets: ["Daromad grafigi", "Xizmat statistikasi", "Eksport"],
    stat: { value: "+28%", label: "o'rtacha o'sish" },
    bgLeft: "bg-[#fffbeb]",
    textMain: "text-zinc-900",
    glowColor: "#fbbf24",
  },
  "framer-slate": {
    accent: "indigo",
    badge: "Ishonchli",
    headline: "Murakkab emas.",
    highlight: "Ishlaydi.",
    highlightClass: "text-zinc-700",
    subline:
      "Ortiqcha bezak yo'q — faqat kerakli funksiyalar. Yangi xodim 10 daqiqada tizimga kiradi va bron qabul qila boshlaydi.",
    bullets: ["Sodda interfeys", "O'zbek tilida", "Yordam 24/7"],
    stat: { value: "10 daq", label: "o'rganish" },
    bgLeft: "bg-[#f4f4f5]",
    textMain: "text-zinc-900",
    glowColor: "#a1a1aa",
  },
  "framer-fuchsia": {
    accent: "fuchsia",
    badge: "Yangi partnerlar",
    headline: "Hozir qo'shiling —",
    highlight: "birinchi bo'ling.",
    highlightClass: "text-fuchsia-600",
    subline:
      "Shahringizdagi mijozlar allaqachon qidiryapti. Profilni to'ldiring, birinchi bronni qabul qiling, o'sishni boshlang.",
    bullets: ["Bepul boshlash", "Tez tasdiqlash", "Mijoz oqimi"],
    stat: { value: "0 so'm", label: "boshlang'ich" },
    bgLeft: "bg-[#fdf4ff]",
    textMain: "text-zinc-900",
    glowColor: "#e879f9",
  },
  "framer-teal": {
    accent: "teal",
    badge: "Jamoa bilan",
    headline: "Butun jamoa —",
    highlight: "bitta tizimda.",
    highlightClass: "text-teal-600",
    subline:
      "Salon egasi, administrator va barberlar bir xil jadvalni ko'radi. Konflikt va chalkashlik yo'qoladi.",
    bullets: ["Rollar va ruxsatlar", "Ishchi takliflari", "Umumiy kalendar"],
    stat: { value: "3×", label: "tezroq bron" },
    bgLeft: "bg-[#f0fdfa]",
    textMain: "text-zinc-900",
    glowColor: "#2dd4bf",
  },
};
