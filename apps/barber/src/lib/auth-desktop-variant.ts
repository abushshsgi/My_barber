/** 10 ta Framer split layout — marketing matn va har xil ranglar. */
export const AUTH_DESKTOP_VARIANTS = [
  { id: "framer-ember", label: "01", desc: "Ember · avtomat bron", family: "framer" },
  { id: "framer-violet", label: "02", desc: "Violet · keyingi daraja", family: "framer" },
  { id: "framer-emerald", label: "03", desc: "Emerald · daromad", family: "framer" },
  { id: "framer-coral", label: "04", desc: "Coral · premium", family: "framer" },
  { id: "framer-midnight", label: "05", desc: "Midnight · pro", family: "framer" },
  { id: "framer-sky", label: "06", desc: "Sky · erkin jadval", family: "framer" },
  { id: "framer-gold", label: "07", desc: "Gold · hisobot", family: "framer" },
  { id: "framer-slate", label: "08", desc: "Slate · sodda", family: "framer" },
  { id: "framer-fuchsia", label: "09", desc: "Fuchsia · erta qo'shil", family: "framer" },
  { id: "framer-teal", label: "10", desc: "Teal · jamoa", family: "framer" },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const AUTH_DESKTOP_VARIANT_IDS = AUTH_DESKTOP_VARIANTS.map((v) => v.id) as [
  AuthDesktopVariant,
  ...AuthDesktopVariant[],
];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "framer-ember";

export function parseAuthDesktopVariant(raw: string | undefined): AuthDesktopVariant {
  const hit = AUTH_DESKTOP_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_DESKTOP_VARIANT;
}

export type AuthAccent =
  | "indigo"
  | "cyan"
  | "rose"
  | "orange"
  | "violet"
  | "purple"
  | "emerald"
  | "teal"
  | "fuchsia";

export const ACCENT_STYLES: Record<
  AuthAccent,
  { logo: string; btn: string; btnHover: string; text: string; progress: string; link: string }
> = {
  indigo: {
    logo: "bg-indigo-500",
    btn: "bg-indigo-500",
    btnHover: "hover:bg-indigo-600",
    text: "text-indigo-500",
    progress: "bg-indigo-500",
    link: "text-indigo-500",
  },
  cyan: {
    logo: "bg-cyan-500",
    btn: "bg-cyan-500",
    btnHover: "hover:bg-cyan-600",
    text: "text-cyan-600",
    progress: "bg-cyan-500",
    link: "text-cyan-600",
  },
  rose: {
    logo: "bg-rose-500",
    btn: "bg-rose-500",
    btnHover: "hover:bg-rose-600",
    text: "text-rose-500",
    progress: "bg-rose-500",
    link: "text-rose-500",
  },
  orange: {
    logo: "bg-orange-500",
    btn: "bg-orange-500",
    btnHover: "hover:bg-orange-600",
    text: "text-orange-500",
    progress: "bg-orange-500",
    link: "text-orange-500",
  },
  violet: {
    logo: "bg-violet-600",
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
    text: "text-violet-600",
    progress: "bg-violet-600",
    link: "text-violet-600",
  },
  purple: {
    logo: "bg-purple-600",
    btn: "bg-purple-600",
    btnHover: "hover:bg-purple-700",
    text: "text-purple-600",
    progress: "bg-purple-600",
    link: "text-purple-600",
  },
  emerald: {
    logo: "bg-emerald-500",
    btn: "bg-emerald-500",
    btnHover: "hover:bg-emerald-600",
    text: "text-emerald-600",
    progress: "bg-emerald-500",
    link: "text-emerald-600",
  },
  teal: {
    logo: "bg-teal-500",
    btn: "bg-teal-500",
    btnHover: "hover:bg-teal-600",
    text: "text-teal-600",
    progress: "bg-teal-500",
    link: "text-teal-600",
  },
  fuchsia: {
    logo: "bg-fuchsia-500",
    btn: "bg-fuchsia-500",
    btnHover: "hover:bg-fuchsia-600",
    text: "text-fuchsia-600",
    progress: "bg-fuchsia-500",
    link: "text-fuchsia-600",
  },
};

export const VARIANT_ACCENT: Record<AuthDesktopVariant, AuthAccent> = {
  "framer-ember": "orange",
  "framer-violet": "violet",
  "framer-emerald": "emerald",
  "framer-coral": "rose",
  "framer-midnight": "indigo",
  "framer-sky": "cyan",
  "framer-gold": "orange",
  "framer-slate": "indigo",
  "framer-fuchsia": "fuchsia",
  "framer-teal": "teal",
};

export const LIGHT_FORM_SKIN = "[&_input]:bg-[#f4f4f5] [&_input]:border-0";
