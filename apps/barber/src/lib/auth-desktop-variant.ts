/** 15 ta SaaS uslubidagi desktop auth layout (har biri boshqacha UI). */
export const AUTH_DESKTOP_VARIANTS = [
  { id: "linear", label: "01", desc: "Linear dark", family: "dark" },
  { id: "stripe", label: "02", desc: "Stripe split", family: "split" },
  { id: "notion", label: "03", desc: "Notion soft", family: "minimal" },
  { id: "vercel", label: "04", desc: "Vercel black", family: "dark" },
  { id: "intercom", label: "05", desc: "Intercom blue", family: "split" },
  { id: "slack", label: "06", desc: "Slack sidebar", family: "split" },
  { id: "figma", label: "07", desc: "Figma mesh", family: "bold" },
  { id: "raycast", label: "08", desc: "Raycast glass", family: "dark" },
  { id: "attio", label: "09", desc: "Attio grid", family: "split" },
  { id: "supabase", label: "10", desc: "Supabase emerald", family: "dark" },
  { id: "clerk", label: "11", desc: "Clerk dots", family: "minimal" },
  { id: "framer", label: "12", desc: "Framer type", family: "bold" },
  { id: "loom", label: "13", desc: "Loom coral", family: "split" },
  { id: "miro", label: "14", desc: "Miro playful", family: "bold" },
  { id: "cal", label: "15", desc: "Cal minimal", family: "minimal" },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const AUTH_DESKTOP_VARIANT_IDS = AUTH_DESKTOP_VARIANTS.map((v) => v.id) as [
  AuthDesktopVariant,
  ...AuthDesktopVariant[],
];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "stripe";

export function parseAuthDesktopVariant(raw: string | undefined): AuthDesktopVariant {
  const hit = AUTH_DESKTOP_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_DESKTOP_VARIANT;
}

export type AuthAccent =
  | "violet"
  | "indigo"
  | "purple"
  | "blue"
  | "emerald"
  | "orange"
  | "rose"
  | "zinc"
  | "intercom"
  | "slack"
  | "yellow"
  | "coral";

export const ACCENT_STYLES: Record<
  AuthAccent,
  { logo: string; btn: string; btnHover: string; text: string; progress: string; link: string }
> = {
  violet: {
    logo: "bg-violet-600",
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
    text: "text-violet-600",
    progress: "bg-violet-600",
    link: "text-violet-600",
  },
  indigo: {
    logo: "bg-indigo-500",
    btn: "bg-indigo-500",
    btnHover: "hover:bg-indigo-600",
    text: "text-indigo-500",
    progress: "bg-indigo-500",
    link: "text-indigo-500",
  },
  purple: {
    logo: "bg-purple-600",
    btn: "bg-purple-600",
    btnHover: "hover:bg-purple-700",
    text: "text-purple-600",
    progress: "bg-purple-600",
    link: "text-purple-600",
  },
  blue: {
    logo: "bg-blue-600",
    btn: "bg-blue-600",
    btnHover: "hover:bg-blue-700",
    text: "text-blue-600",
    progress: "bg-blue-600",
    link: "text-blue-600",
  },
  emerald: {
    logo: "bg-emerald-500",
    btn: "bg-emerald-500",
    btnHover: "hover:bg-emerald-600",
    text: "text-emerald-500",
    progress: "bg-emerald-500",
    link: "text-emerald-500",
  },
  orange: {
    logo: "bg-orange-500",
    btn: "bg-orange-500",
    btnHover: "hover:bg-orange-600",
    text: "text-orange-500",
    progress: "bg-orange-500",
    link: "text-orange-500",
  },
  rose: {
    logo: "bg-rose-500",
    btn: "bg-rose-500",
    btnHover: "hover:bg-rose-600",
    text: "text-rose-500",
    progress: "bg-rose-500",
    link: "text-rose-500",
  },
  zinc: {
    logo: "bg-zinc-900",
    btn: "bg-zinc-900",
    btnHover: "hover:bg-zinc-800",
    text: "text-zinc-900",
    progress: "bg-zinc-900",
    link: "text-zinc-700",
  },
  intercom: {
    logo: "bg-[#286efa]",
    btn: "bg-[#286efa]",
    btnHover: "hover:bg-[#1f5ed4]",
    text: "text-[#286efa]",
    progress: "bg-[#286efa]",
    link: "text-[#286efa]",
  },
  slack: {
    logo: "bg-[#4a154b]",
    btn: "bg-[#611f69]",
    btnHover: "hover:bg-[#4a154b]",
    text: "text-[#611f69]",
    progress: "bg-[#611f69]",
    link: "text-[#611f69]",
  },
  yellow: {
    logo: "bg-[#ffd02f]",
    btn: "bg-[#ffd02f]",
    btnHover: "hover:bg-[#f5c400]",
    text: "text-[#c9a000]",
    progress: "bg-[#ffd02f]",
    link: "text-[#a68500]",
  },
  coral: {
    logo: "bg-[#ff6b4a]",
    btn: "bg-[#ff6b4a]",
    btnHover: "hover:bg-[#e85a3a]",
    text: "text-[#ff6b4a]",
    progress: "bg-[#ff6b4a]",
    link: "text-[#ff6b4a]",
  },
};

export const VARIANT_ACCENT: Record<AuthDesktopVariant, AuthAccent> = {
  linear: "indigo",
  stripe: "purple",
  notion: "zinc",
  vercel: "zinc",
  intercom: "intercom",
  slack: "slack",
  figma: "rose",
  raycast: "violet",
  attio: "blue",
  supabase: "emerald",
  clerk: "purple",
  framer: "orange",
  loom: "coral",
  miro: "yellow",
  cal: "zinc",
};

/** Dark form skin — inputlarni qorong'u layoutlarda o'qilishi uchun. */
export const DARK_FORM_SKIN =
  "[&_input]:border-zinc-700 [&_input]:bg-zinc-900/80 [&_input]:text-zinc-100 [&_input]:placeholder:text-zinc-500 [&_label]:text-zinc-400 [&_button[type=button]]:text-zinc-400";

export const LIGHT_FORM_SKIN =
  "[&_input]:bg-[#f4f4f5] [&_input]:border-0";
