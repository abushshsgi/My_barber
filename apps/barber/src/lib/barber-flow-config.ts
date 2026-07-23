import type { ViewMode } from "@/components/barber/BarberContext";

export type SignupFlow = "owner" | "employee" | "mybarber" | "independent";
export type SignupBusinessKind = "barbershop" | "beauty_salon";
export type FlowIdentity = SignupFlow | "unknown";
export type NavCapability = "independentBase" | "salonOwner" | "salonWorker";
export type Tone = "salon" | "team" | "brand" | "solo" | "neutral";

export const BUSINESS_KIND_META: Record<
  SignupBusinessKind,
  { title: string; subtitle: string; badge: string }
> = {
  barbershop: {
    title: "Sartaroshxona",
    subtitle: "Erkaklar soch-soqol, klassik va zamonaviy sartaroshlik",
    badge: "Barber",
  },
  beauty_salon: {
    title: "Go'zallik saloni",
    subtitle: "Ayollar go'zalligi, soch, manikyur va spa xizmatlari",
    badge: "Salon",
  },
};

export function servicesPageCopy(kind: SignupBusinessKind | null | undefined): {
  title: string;
  salonTitle: string;
  description: string;
  salonDescription: string;
  independentDescription: string;
} {
  if (kind === "beauty_salon") {
    return {
      title: "Go'zallik xizmatlari",
      salonTitle: "Salon xizmatlari",
      description: "Manikyur, makiyaj, soch va spa — katalogdan tanlang va narx belgilang.",
      salonDescription: "Go'zallik saloni katalogi — xizmatlarni faollashtiring va narx belgilang.",
      independentDescription: "Mustaqil booking uchun go'zallik xizmatlarini faollashtiring.",
    };
  }
  return {
    title: "Xizmatlar",
    salonTitle: "Salon xizmatlari",
    description: "Katalogdan xizmatni tanlang, narx qo'ying — avtomatik saqlanadi.",
    salonDescription: "Admin katalogidagi barcha xizmatlar — faollashtiring va narx belgilang.",
    independentDescription: "Mustaqil booking uchun xizmatlarni faollashtiring va narx belgilang.",
  };
}

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
    | "QrCode"
    | "Package"
    | "BarChart3"
    | "LineChart"
    | "Megaphone"
    | "Target"
    | "UserCog"
    | "Settings"
    | "HelpCircle"
    | "Building2"
    | "Images"
    | "Sparkles";
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
    { to: "/barber/stats/graphs", label: "Grafiklar", iconName: "LineChart", group: "Biznes" },
    { to: "/barber/marketing", label: "Marketing", iconName: "Megaphone", group: "Biznes" },
    { to: "/barber/goals", label: "Maqsadlar", iconName: "Target", group: "Biznes" },
    { to: "/barber/profile", label: "Profil", iconName: "UserCog", group: "Sozlama" },
    { to: "/barber/settings", label: "Sozlamalar", iconName: "Settings", group: "Sozlama" },
    { to: "/barber/help", label: "Yordam", iconName: "HelpCircle", group: "Sozlama" },
  ],
  salonOwner: [
    { to: "/barber/salon-view", label: "Salon", iconName: "Building2", group: "Salon" },
    { to: "/barber/amenities", label: "Mijozlar uchun", iconName: "Sparkles", group: "Salon" },
    { to: "/barber/salon-view/gallery", label: "Galereya", iconName: "Images", group: "Salon" },
    { to: "/barber/salon-view/reviews", label: "Sharhlar", iconName: "Star", group: "Salon" },
    { to: "/barber/salon-view/team", label: "Jamoa", iconName: "Users", group: "Salon" },
    { to: "/barber/profile", label: "Profil", iconName: "UserCog", group: "Sozlama" },
    { to: "/barber/settings", label: "Sozlamalar", iconName: "Settings", group: "Sozlama" },
    { to: "/barber/notifications", label: "Bildirishnomalar", iconName: "Bell", group: "Sozlama" },
    { to: "/barber/help", label: "Yordam", iconName: "HelpCircle", group: "Sozlama" },
  ],
  salonWorker: [
    { to: "/barber/salon-view", label: "Salon", iconName: "Building2", group: "Salon" },
    { to: "/barber/services", label: "Xizmatlarim", iconName: "Scissors", group: "Salon" },
    { to: "/barber/salon-view/members", label: "Jamoa", iconName: "Users", group: "Salon" },
    { to: "/barber/salon-view/reviews", label: "Sharhlar", iconName: "Star", group: "Salon" },
    { to: "/barber/salon-view/gallery", label: "Galereya", iconName: "Images", group: "Salon" },
    { to: "/barber/profile", label: "Profil", iconName: "UserCog", group: "Sozlama" },
    { to: "/barber/settings", label: "Sozlamalar", iconName: "Settings", group: "Sozlama" },
    { to: "/barber/notifications", label: "Bildirishnomalar", iconName: "Bell", group: "Sozlama" },
    { to: "/barber/help", label: "Yordam", iconName: "HelpCircle", group: "Sozlama" },
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
    signupNextStep: "Salon nomi, manzil, barber profili, xizmatlar va jadval",
    desc: "Salon sahifasini boshqaring; bronlar va kalendar barber kabinetida.",
    benefit: "Salon egasi sifatida ham barbersiz",
    accent: "salon",
    badge: "Ega",
    accentClass: "border-amber-500/40 bg-amber-500/10 text-amber-700",
    heroTitle: "Salon boshqaruvini ishga tushiring",
    heroSubtitle: "Salon sahifasi — portfolio va sharhlar. Bronlar barber kabinetida.",
    successTitle: "Owner onboarding tayyor",
    successBody: "Bronlar va kalendar barber kabinetida; salon sahifasida portfolio va jamoa.",
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
export type AuthFlowMarketingContent = {
  badge: string;
  headline: string;
  highlight: string;
  subline: string;
  bullets: readonly [string, string, string];
  bulletIcons: readonly [string, string, string];
  stat: { value: string; label: string };
};

/** Auth split layout — chap va o'ng panel foni (bir xil ton). */
export type AuthPanelTone = {
  bg: string;
  glow: string;
};

export const AUTH_DEFAULT_PANEL_TONE: AuthPanelTone = {
  bg: "bg-[#f4f4f5]",
  glow: "#a1a1aa",
};

export const AUTH_FLOW_PANEL_TONE: Record<SignupFlow, AuthPanelTone> = {
  owner: { bg: "bg-[#f4f4f5]", glow: "#fdba74" },
  employee: { bg: "bg-[#f4f4f5]", glow: "#7dd3fc" },
  mybarber: { bg: "bg-[#f4f4f5]", glow: "#c4b5fd" },
  independent: { bg: "bg-[#f4f4f5]", glow: "#6ee7b7" },
};

export function resolveAuthPanelTone(
  tab: "login" | "signup",
  flow: SignupFlow | null,
): AuthPanelTone {
  if (tab === "signup" && flow) return AUTH_FLOW_PANEL_TONE[flow];
  return AUTH_DEFAULT_PANEL_TONE;
}

export const AUTH_FLOW_MARKETING: Record<SignupFlow, AuthFlowMarketingContent> = {
  owner: {
    badge: "Salon egasi",
    headline: "Salonni",
    highlight: "to'ldiring",
    subline:
      "Bo'sh o'rinlar → to'liq kalendar. Jamoa, xizmatlar va mijoz oqimini bir kabinetdan boshqaring.",
    bullets: ["Birinchi bronni bugun qabul qiling", "Jamoa va kalendar bir joyda", "TOP boost bilan xaritada yuqoriroq"],
    bulletIcons: ["Users", "CalendarDays", "Wallet"],
    stat: { value: "Bugun", label: "birinchi bron" },
  },
  employee: {
    badge: "Salon ishchisi",
    headline: "Jamoa bilan",
    highlight: "daromad qiling",
    subline:
      "Mavjud salonga qo'shiling — bronlar, chat va mijozlar bilan darhol ishlang.",
    bullets: ["Tez ulanish", "GPS orqali joy tasdiqlash", "Bronlar va mijozlar bilan ishlash"],
    bulletIcons: ["MapPin", "MessageSquare", "CalendarDays"],
    stat: { value: "~100 m", label: "salondan yaqinlik" },
  },
  mybarber: {
    badge: "MyBarber",
    headline: "Tez oching,",
    highlight: "mijoz oling",
    subline:
      "MyBarber shabloni bilan salonni qisqa vaqt ichida ishga tushiring — tayyor brend va tez sozlash.",
    bullets: ["Tayyor MyBarber uslubi", "Tez profil va xizmatlar", "Mijoz oqimini yoqish"],
    bulletIcons: ["Sparkles", "Zap", "Users"],
    stat: { value: "Bugun", label: "ochish" },
  },
  independent: {
    badge: "Mustaqil barber",
    headline: "O'zingiz",
    highlight: "to'ldiring",
    subline:
      "Salonsiz shaxsiy workspace — jadval, xizmatlar va daromad sizniki. Birinchi bronni bugun oling.",
    bullets: ["Shaxsiy jadval va bronlar", "O'z xizmatlaringiz", "To'liq mustaqil ish maydoni"],
    bulletIcons: ["Briefcase", "Clock", "Star"],
    stat: { value: "Solo", label: "ish maydoni" },
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
export function pathAllowedInSalonWorkspace(
  pathname: string,
  isJoinedWorker = false,
): boolean {
  if (pathname === "/barber/salon-view" || pathname.startsWith("/barber/salon-view/")) {
    return true;
  }
  // Xizmatlar sahifasi salon rejimida faqat ishchi barber uchun ("Xizmatlarim").
  // Salon egasi xizmatlarni barber kabineti (independent rejim)dan boshqaradi.
  if (pathname === "/barber/services") {
    return isJoinedWorker;
  }
  if (pathname === "/barber/amenities") {
    return !isJoinedWorker;
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
  return input.viewMode === "salon" ? "Salon sahifasi" : "Barber kabineti";
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
