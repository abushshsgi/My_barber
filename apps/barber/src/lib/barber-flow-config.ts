import type { ViewMode } from "@/components/barber/BarberContext";

export type SignupFlow = "owner" | "employee" | "mybarber" | "independent";
export type FlowIdentity = SignupFlow | "unknown";
export type NavCapability = "independentBase" | "salonOwner" | "salonWorker";
export type Tone = "salon" | "team" | "brand" | "solo" | "neutral";

export type NavItem = {
  to: string;
  label: string;
  iconName:
    | "LayoutDashboard"
    | "CalendarDays"
    | "CalendarClock"
    | "Users"
    | "MessageSquare"
    | "Bell"
    | "Star"
    | "Scissors"
    | "Clock"
    | "ImageIcon"
    | "Wallet"
    | "Receipt"
    | "Package"
    | "BarChart3"
    | "Megaphone"
    | "Target"
    | "UserCog"
    | "Settings"
    | "HelpCircle"
    | "Building2"
    | "Images";
  group?: string;
};

export const NAV_CONFIG: Record<NavCapability, NavItem[]> = {
  independentBase: [
    { to: "/barber", label: "Dashboard", iconName: "LayoutDashboard", group: "Asosiy" },
    { to: "/barber/calendar", label: "Kalendar", iconName: "CalendarDays", group: "Asosiy" },
    { to: "/barber/bookings", label: "Bronlar", iconName: "CalendarClock", group: "Asosiy" },
    { to: "/barber/services", label: "Xizmatlar", iconName: "Scissors", group: "Asosiy" },
    { to: "/barber/schedule", label: "Ish jadvali", iconName: "Clock", group: "Asosiy" },
    { to: "/barber/clients", label: "Mijozlar", iconName: "Users", group: "Asosiy" },
    { to: "/barber/chat", label: "Chat", iconName: "MessageSquare", group: "Aloqa" },
    { to: "/barber/notifications", label: "Bildirishnomalar", iconName: "Bell", group: "Aloqa" },
    { to: "/barber/reviews", label: "Sharhlar", iconName: "Star", group: "Aloqa" },
    { to: "/barber/portfolio", label: "Portfolio", iconName: "ImageIcon", group: "Aloqa" },
    { to: "/barber/earnings", label: "Daromad", iconName: "Wallet", group: "Biznes" },
    { to: "/barber/expenses", label: "Xarajatlar", iconName: "Receipt", group: "Biznes" },
    { to: "/barber/inventory", label: "Inventar", iconName: "Package", group: "Biznes" },
    { to: "/barber/stats", label: "Statistika", iconName: "BarChart3", group: "Biznes" },
    { to: "/barber/marketing", label: "Marketing", iconName: "Megaphone", group: "Biznes" },
    { to: "/barber/goals", label: "Maqsadlar", iconName: "Target", group: "Biznes" },
    { to: "/barber/profile", label: "Profil", iconName: "UserCog", group: "Sozlama" },
    { to: "/barber/settings", label: "Sozlamalar", iconName: "Settings", group: "Sozlama" },
    { to: "/barber/help", label: "Yordam", iconName: "HelpCircle", group: "Sozlama" },
  ],
  salonOwner: [
    { to: "/barber/salon-view", label: "Salon", iconName: "Building2" },
    { to: "/barber/salon-view/gallery", label: "Galereya", iconName: "Images" },
    { to: "/barber/salon-view/reviews", label: "Sharhlar", iconName: "Star" },
    { to: "/barber/salon-view/team", label: "Jamoa", iconName: "Users" },
  ],
  salonWorker: [
    { to: "/barber/salon-view", label: "Salon", iconName: "Building2" },
    { to: "/barber/salon-view/members", label: "Jamoa", iconName: "Users" },
    { to: "/barber/salon-view/reviews", label: "Sharhlar", iconName: "Star" },
    { to: "/barber/salon-view/gallery", label: "Galereya", iconName: "Images" },
  ],
};

export const SIGNUP_FLOW_PATH: Record<SignupFlow, string> = {
  owner: "/salon/create",
  employee: "/salon/join",
  mybarber: "/mybarber/setup",
  independent: "/independent/setup",
};

export const FLOW_IDENTITY_META: Record<
  SignupFlow,
  {
    title: string;
    /** Signup kartada ko'rinadigan qisqa o'zbek sarlavha */
    signupTitle: string;
    /** Kim uchun — bir qator */
    signupSubtitle: string;
    /** Keyingi qadam qisqacha */
    signupNextStep: string;
    desc: string;
    benefit: string;
    accent: Tone;
    badge: string;
    accentClass: string;
    heroTitle: string;
    heroSubtitle: string;
    successTitle: string;
    successBody: string;
    emptyTitle: string;
    emptyBody: string;
  }
> = {
  owner: {
    title: "Salon owner",
    signupTitle: "Salon ochaman",
    signupSubtitle: "O'z salonim bor — jamoa va xizmatlarni boshqaraman",
    signupNextStep: "Salon nomi, manzil, xizmatlar va jadval (5–7 qadam)",
    desc: "Salonni boshqarish, jamoa va salon workspace bilan ishlash.",
    benefit: "Jamoa va xizmatlarni boshqaring",
    accent: "salon",
    badge: "Ega",
    accentClass: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    heroTitle: "Salon boshqaruvini ishga tushiring",
    heroSubtitle: "Jamoa, xizmatlar va salon jarayonlarini owner sifatida boshqaring.",
    successTitle: "Owner onboarding tayyor",
    successBody: "Endi salon workspace orqali jamoa va salon natijalarini boshqarishingiz mumkin.",
    emptyTitle: "Owner panel hali bo'sh",
    emptyBody: "Jamoa va xizmatlar qo'shilgach boshqaruv ko'rsatkichlari shu yerda ko'rinadi.",
  },
  employee: {
    title: "Salonga qo'shilish",
    signupTitle: "Salonga qo'shilaman",
    signupSubtitle: "Boshqaning salonida ishchi barber sifatida ishlayman",
    signupNextStep: "Salon qidirish + GPS (salondan ~100 m ichida)",
    desc: "Mavjud salon jamoasiga ulanib, salon workspace'da ishlash.",
    benefit: "Mavjud salon jamoasiga qo'shiling",
    accent: "team",
    badge: "Ishchi",
    accentClass: "border-sky-500/40 bg-sky-500/10 text-sky-700",
    heroTitle: "Salon jamoasiga ulanish",
    heroSubtitle: "Join worker sifatida salon ichida mijozlar oqimi bilan ishlang.",
    successTitle: "Worker onboarding tayyor",
    successBody: "Endi salon ish maydonida jamoa bilan birga bronlar ustida ishlashingiz mumkin.",
    emptyTitle: "Salon ish maydoni hali bo'sh",
    emptyBody: "Salon ichidagi ishlar va jamoa faoliyati shu yerda ko'rinadi.",
  },
  mybarber: {
    title: "MyBarber salon",
    signupTitle: "MyBarber bilan ochaman",
    signupSubtitle: "Tayyor brend shabloni — tez va oson salon ochish",
    signupNextStep: "Qisqa profil, joy, xizmatlar (MyBarber uslubi)",
    desc: "MyBarber brendi ostida tezkor salon ochish va sozlash.",
    benefit: "MyBarber brendi ostida tez oching",
    accent: "brand",
    badge: "MyBarber",
    accentClass: "border-violet-500/40 bg-violet-500/10 text-violet-700",
    heroTitle: "MyBarber brend saloningiz",
    heroSubtitle: "MyBarber uslubida tez ishga tushadigan salon tajribasini yarating.",
    successTitle: "MyBarber onboarding tayyor",
    successBody: "MyBarber saloningiz yaratildi, endi mijoz oqimi va xizmatlarni faollashtiring.",
    emptyTitle: "MyBarber panel hali bo'sh",
    emptyBody: "Brand sahifalari va xizmatlar to'ldirilgach bu yerda natijalar chiqadi.",
  },
  independent: {
    title: "Mustaqil barber",
    signupTitle: "Mustaqil ishlayman",
    signupSubtitle: "Salonsiz — uydan, studiyadan yoki mobil barber",
    signupNextStep: "Shaxsiy profil, joylashuv, xizmatlar va jadval",
    desc: "Salonsiz shaxsiy ish maydoni va mustaqil xizmatlar.",
    benefit: "Salonsiz shaxsiy ish maydoni",
    accent: "solo",
    badge: "Solo",
    accentClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
    heroTitle: "Mustaqil barber workspace",
    heroSubtitle: "Shaxsiy xizmatlar, jadval va daromadlarni to'liq o'zingiz boshqaring.",
    successTitle: "Mustaqil onboarding tayyor",
    successBody: "Endi mustaqil ish maydonida mijozlar va daromadlarni boshqarishga tayyorsiz.",
    emptyTitle: "Mustaqil panel hali bo'sh",
    emptyBody: "Xizmatlar va bronlar kelgach shaxsiy ko'rsatkichlar shu yerda chiqadi.",
  },
};

/** Auth chap panel — tanlangan signup yo'li bo'yicha marketing. */
export type AuthMarketingFeature = {
  icon: string;
  title: string;
  desc: string;
};

export type AuthMarketingVisual = {
  gradient: string;
  icon: string;
  ring: string;
};

export type AuthFlowMarketingContent = {
  badge: string;
  headline: string;
  highlight: string;
  subline: string;
  shortTitle: string;
  longText: string;
  bullets: readonly [string, string, string];
  features: readonly [AuthMarketingFeature, AuthMarketingFeature, AuthMarketingFeature];
  stat: { value: string; label: string };
  visual: AuthMarketingVisual;
};

export const AUTH_FLOW_MARKETING: Record<SignupFlow, AuthFlowMarketingContent> = {
  owner: {
    badge: "Salon egasi",
    headline: "Salonni",
    highlight: "boshqaring",
    shortTitle: "Salonni to'liq boshqaring",
    subline:
      "Jamoa, xizmatlar va bronlarni bitta joydan boshqaring. Owner sifatida salon natijalari ustidan to'liq nazorat sizda.",
    longText:
      "Salon egasi sifatida siz jamoa a'zolarini qo'shasiz, xizmat narxlari va jadvalni sozlaysiz, bronlar oqimini kuzatasiz va daromad ko'rsatkichlarini bir paneldan ko'rasiz. MySaloon Partner salon kundalik ishlarini sodda va tushunarli qiladi — qog'oz jadvallar va chalkash chatlar o'rniga.",
    bullets: ["Jamoa va xizmatlar boshqaruvi", "Salon jadvali va bronlar", "Daromad va statistika"],
    features: [
      { icon: "Users", title: "Jamoa boshqaruvi", desc: "Barberlarni qo'shing va rollarni belgilang" },
      { icon: "CalendarDays", title: "Bron va jadval", desc: "Online bronlar va ish vaqtlari" },
      { icon: "Wallet", title: "Daromad", desc: "Kunlik va oylik hisobotlar" },
    ],
    stat: { value: "5–7", label: "qadam sozlash" },
    visual: { gradient: "from-amber-100 via-orange-50 to-[#f4f4f5]", icon: "Store", ring: "ring-amber-200/70" },
  },
  employee: {
    badge: "Salon ishchisi",
    headline: "Jamoa bilan",
    highlight: "ishlang",
    shortTitle: "Salon jamoasiga qo'shiling",
    subline:
      "Mavjud salonga qo'shiling va salon workspace'da mijozlar, bronlar va chat orqali ish olib boring.",
    longText:
      "Ishchi barber sifatida siz mavjud salon tizimiga ulanib, tayyor mijoz oqimi va jadval bilan ishlay boshlaysiz. GPS orqali joyingiz tasdiqlanadi, salon egasi jamoani boshqaradi — siz esa bronlar, chat va xizmatlar ustida e'tibor qaratishingiz mumkin.",
    bullets: ["Salon jamoasiga ulanish", "GPS orqali joy tasdiqlash", "Bronlar va mijozlar bilan ishlash"],
    features: [
      { icon: "MapPin", title: "Joy tasdiqlash", desc: "Salondan ~100 m ichida GPS tekshiruvi" },
      { icon: "MessageSquare", title: "Chat va bronlar", desc: "Mijozlar bilan to'g'ridan-to'g'ri aloqa" },
      { icon: "CalendarDays", title: "Ish jadvali", desc: "Salon vaqtiga mos bronlar" },
    ],
    stat: { value: "~100 m", label: "salondan yaqinlik" },
    visual: { gradient: "from-sky-100 via-blue-50 to-[#f4f4f5]", icon: "UserPlus", ring: "ring-sky-200/70" },
  },
  mybarber: {
    badge: "MyBarber",
    headline: "Tez oching,",
    highlight: "brend bilan",
    shortTitle: "MyBarber bilan tez boshlang",
    subline:
      "MyBarber shabloni bilan salonni qisqa vaqt ichida ishga tushiring — tayyor brend ko'rinishi va tez sozlash.",
    longText:
      "MyBarber yo'li yangi salonni tez ochish uchun mo'ljallangan: brend uslubi, profil shabloni va xizmatlar ro'yxati tayyor. Bir necha qadamda salon sahifangiz tayyor bo'ladi va mijozlar oqimini yoqish mumkin — dizayn va texnik qismlarni qayta o'ylab chiqish shart emas.",
    bullets: ["Tayyor MyBarber uslubi", "Tez profil va xizmatlar", "Mijoz oqimini yoqish"],
    features: [
      { icon: "Sparkles", title: "Brend shablon", desc: "Tayyor MyBarber ko'rinishi" },
      { icon: "Zap", title: "Tez sozlash", desc: "3–5 qadamda ishga tushirish" },
      { icon: "Users", title: "Mijoz oqimi", desc: "Online bron va profil" },
    ],
    stat: { value: "3–5", label: "qadam sozlash" },
    visual: { gradient: "from-violet-100 via-purple-50 to-[#f4f4f5]", icon: "Sparkles", ring: "ring-violet-200/70" },
  },
  independent: {
    badge: "Mustaqil barber",
    headline: "O'zingiz",
    highlight: "boshqaring",
    shortTitle: "Mustaqil ish maydoningiz",
    subline:
      "Salonsiz shaxsiy workspace — uydan, studiyadan yoki mobil xizmat. Jadval, xizmatlar va daromad sizniki.",
    longText:
      "Mustaqil barber uchun alohida workspace: o'z jadvalingiz, xizmatlaringiz va mijozlaringiz — hech qanday salon egasiga bog'liq emas. Uyda, studiyada yoki mobil xizmat ko'rsatishingiz mumkin. Barcha bronlar, chat va daromad shaxsiy kabinetingizda.",
    bullets: ["Shaxsiy jadval va bronlar", "O'z xizmatlaringiz", "To'liq mustaqil ish maydoni"],
    features: [
      { icon: "Briefcase", title: "Shaxsiy workspace", desc: "Salonsiz mustaqil kabinet" },
      { icon: "Clock", title: "O'z jadvalingiz", desc: "Vaqt va bandlikni boshqaring" },
      { icon: "Star", title: "Mijozlar", desc: "Sharhlar va portfolio" },
    ],
    stat: { value: "Solo", label: "ish maydoni" },
    visual: { gradient: "from-emerald-100 via-green-50 to-[#f4f4f5]", icon: "Briefcase", ring: "ring-emerald-200/70" },
  },
};

export const UNKNOWN_FLOW_META = {
  title: "Barber workspace",
  signupTitle: "Barber kabineti",
  signupSubtitle: "Ro'yxatdan o'tish yo'lini tanlang",
  signupNextStep: "4 ta variantdan birini tanlang",
  desc: "Flow aniqlanmagan holat, standart ish maydoni ishlatiladi.",
  benefit: "Standart barber ish maydoni",
  accent: "neutral" as const,
  badge: "Standart",
  accentClass: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700",
  heroTitle: "Barber ish maydoni",
  heroSubtitle: "Asosiy ishlar va onboarding bosqichlarini shu yerdan davom ettiring.",
  successTitle: "Onboarding yakunlandi",
  successBody: "Barber panel ishlashga tayyor.",
  emptyTitle: "Panel hali bo'sh",
  emptyBody: "Dastlabki ma'lumotlar paydo bo'lishi bilan karta to'ldiriladi.",
};

export type QuickAction = { to: string; label: string; iconName: NavItem["iconName"] };

export const QUICK_ACTIONS: Record<FlowIdentity, QuickAction[]> = {
  owner: [
    { to: "/barber/salon-view/team", label: "Jamoani boshqarish", iconName: "Users" },
    { to: "/barber/salon-view", label: "Salon overview", iconName: "Building2" },
    { to: "/barber/marketing", label: "Marketing", iconName: "Megaphone" },
  ],
  employee: [
    { to: "/barber/salon-view/members", label: "Jamoa a'zolari", iconName: "Users" },
    { to: "/barber/bookings", label: "Bronlar", iconName: "CalendarClock" },
    { to: "/barber/salon-view", label: "Salon sahifasi", iconName: "Building2" },
  ],
  mybarber: [
    { to: "/barber/salon-view/gallery", label: "Brand galereya", iconName: "Images" },
    { to: "/barber/salon-view", label: "MyBarber salon", iconName: "Building2" },
    { to: "/barber/marketing", label: "Brend marketing", iconName: "Megaphone" },
  ],
  independent: [
    { to: "/barber/bookings", label: "Bronlarni boshqarish", iconName: "CalendarClock" },
    { to: "/barber/earnings", label: "Daromad", iconName: "Wallet" },
    { to: "/barber/portfolio", label: "Portfolio", iconName: "ImageIcon" },
  ],
  unknown: [
    { to: "/barber/profile", label: "Profilni to'ldirish", iconName: "UserCog" },
    { to: "/barber/bookings", label: "Bronlar", iconName: "CalendarClock" },
    { to: "/barber/help", label: "Yordam", iconName: "HelpCircle" },
  ],
};

export function inferFlowIdentity(input: {
  onboardingFlow?: string | null;
  workMode: "salon" | "independent";
  ownsSalon: boolean;
  activeSalonId: number | null;
}): FlowIdentity {
  const flow = (input.onboardingFlow || "").trim();
  if (flow === "owner" || flow === "employee" || flow === "mybarber" || flow === "independent") {
    return flow;
  }
  if (input.workMode === "independent") return "independent";
  if (input.ownsSalon) return "owner";
  if (input.activeSalonId != null) return "employee";
  return "unknown";
}

/** Salon rejimida yoqilgan marshrutlar — chuqur havola va bookmarklar ishlashi uchun. */
export function pathAllowedInSalonWorkspace(pathname: string): boolean {
  if (pathname === "/barber/salon-view" || pathname.startsWith("/barber/salon-view/")) {
    return true;
  }
  if (
    pathname === "/barber/profile" ||
    pathname === "/barber/settings" ||
    pathname === "/barber/help" ||
    pathname === "/barber/notifications" ||
    pathname.startsWith("/barber/notifications/")
  ) {
    return true;
  }
  if (pathname === "/barber/chat" || pathname.startsWith("/barber/chat/")) {
    return true;
  }
  return false;
}

export function getCapabilities(input: {
  onboardingComplete: boolean;
  viewMode: ViewMode;
  isJoinedWorker: boolean;
}): NavCapability {
  if (!input.onboardingComplete) return "independentBase";
  if (input.viewMode === "salon") {
    return input.isJoinedWorker ? "salonWorker" : "salonOwner";
  }
  return "independentBase";
}

export function getWorkspaceLabel(input: { isJoinedWorker: boolean; viewMode: ViewMode }): string {
  if (input.isJoinedWorker) {
    return input.viewMode === "salon" ? "Salon ish maydoni" : "Shaxsiy ish maydoni";
  }
  return input.viewMode === "salon" ? "Salon" : "Mustaqil";
}

export function getFlowMeta(flowIdentity: FlowIdentity) {
  if (flowIdentity === "unknown") return UNKNOWN_FLOW_META;
  return FLOW_IDENTITY_META[flowIdentity];
}

export function getOnboardingCta(requiredNextPath: string | null): { title: string; body: string } {
  if (requiredNextPath?.startsWith("/salon/join")) {
    return {
      title: "Salonga qo'shilishni yakunlang",
      body: "Salonni tanlash, lokatsiya va ish jadvali bosqichlarini yakunlang.",
    };
  }
  if (requiredNextPath?.startsWith("/mybarber/setup")) {
    return {
      title: "MyBarber salonni yakunlang",
      body: "MyBarber yo'nalishi uchun profil, xizmatlar va jadvalni to'liq kiriting.",
    };
  }
  if (requiredNextPath?.startsWith("/independent/setup")) {
    return {
      title: "Mustaqil barber profilini yakunlang",
      body: "Lokatsiya, xizmatlar va mustaqil ish vaqtlarini yakunlab, panelni faollashtiring.",
    };
  }
  return {
    title: "Profilni to'liq ro'yxatdan o'tkazing",
    body: "Mijozlar sizni topishi uchun onboarding bosqichlarini yakunlang.",
  };
}

export function getOnboardingTone(requiredNextPath: string | null): Tone {
  if (requiredNextPath?.startsWith("/salon/create")) return "salon";
  if (requiredNextPath?.startsWith("/salon/join")) return "team";
  if (requiredNextPath?.startsWith("/mybarber/setup")) return "brand";
  if (requiredNextPath?.startsWith("/independent/setup")) return "solo";
  return "neutral";
}
