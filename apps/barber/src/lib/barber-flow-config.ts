import type { ViewMode } from "@/components/barber/BarberContext";

export type SignupFlow = "owner" | "employee" | "mybarber" | "independent";
export type FlowIdentity = SignupFlow | "unknown";
export type NavCapability = "independentBase" | "salonOwner" | "salonWorker";

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
    desc: string;
    accent: "salon" | "team" | "brand" | "solo";
  }
> = {
  owner: {
    title: "Salon owner",
    desc: "Salonni boshqarish, jamoa va salon workspace bilan ishlash.",
    accent: "salon",
  },
  employee: {
    title: "Salonga qo'shilish",
    desc: "Mavjud salon jamoasiga ulanib, salon workspace'da ishlash.",
    accent: "team",
  },
  mybarber: {
    title: "MyBarber salon",
    desc: "MyBarber brendi ostida tezkor salon ochish va sozlash.",
    accent: "brand",
  },
  independent: {
    title: "Mustaqil barber",
    desc: "Salonsiz shaxsiy ish maydoni va mustaqil xizmatlar.",
    accent: "solo",
  },
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
