/** 10 ta variant — Linear / Figma / Framer / Supabase uslubida, har xil ranglar. */
export const AUTH_DESKTOP_VARIANTS = [
  { id: "linear-indigo", label: "01", desc: "Linear · indigo", family: "linear" },
  { id: "linear-crimson", label: "02", desc: "Linear · crimson", family: "linear" },
  { id: "figma-sunset", label: "03", desc: "Figma · sunset", family: "figma" },
  { id: "figma-ocean", label: "04", desc: "Figma · ocean", family: "figma" },
  { id: "figma-nova", label: "05", desc: "Figma · nova", family: "figma" },
  { id: "framer-ember", label: "06", desc: "Framer · ember", family: "framer" },
  { id: "framer-violet", label: "07", desc: "Framer · violet", family: "framer" },
  { id: "supabase-grove", label: "08", desc: "Supabase · grove", family: "supabase" },
  { id: "supabase-abyss", label: "09", desc: "Supabase · abyss", family: "supabase" },
  { id: "supabase-pulse", label: "10", desc: "Supabase · pulse", family: "supabase" },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const AUTH_DESKTOP_VARIANT_IDS = AUTH_DESKTOP_VARIANTS.map((v) => v.id) as [
  AuthDesktopVariant,
  ...AuthDesktopVariant[],
];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "figma-sunset";

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
    text: "text-indigo-400",
    progress: "bg-indigo-500",
    link: "text-indigo-400",
  },
  cyan: {
    logo: "bg-cyan-500",
    btn: "bg-cyan-500",
    btnHover: "hover:bg-cyan-600",
    text: "text-cyan-400",
    progress: "bg-cyan-500",
    link: "text-cyan-400",
  },
  rose: {
    logo: "bg-rose-500",
    btn: "bg-rose-500",
    btnHover: "hover:bg-rose-600",
    text: "text-rose-400",
    progress: "bg-rose-500",
    link: "text-rose-400",
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
    text: "text-violet-500",
    progress: "bg-violet-600",
    link: "text-violet-500",
  },
  purple: {
    logo: "bg-purple-600",
    btn: "bg-purple-600",
    btnHover: "hover:bg-purple-700",
    text: "text-purple-500",
    progress: "bg-purple-600",
    link: "text-purple-500",
  },
  emerald: {
    logo: "bg-emerald-500",
    btn: "bg-emerald-500",
    btnHover: "hover:bg-emerald-600",
    text: "text-emerald-400",
    progress: "bg-emerald-500",
    link: "text-emerald-400",
  },
  teal: {
    logo: "bg-teal-500",
    btn: "bg-teal-500",
    btnHover: "hover:bg-teal-600",
    text: "text-teal-400",
    progress: "bg-teal-500",
    link: "text-teal-400",
  },
  fuchsia: {
    logo: "bg-fuchsia-500",
    btn: "bg-fuchsia-500",
    btnHover: "hover:bg-fuchsia-600",
    text: "text-fuchsia-400",
    progress: "bg-fuchsia-500",
    link: "text-fuchsia-400",
  },
};

export const VARIANT_ACCENT: Record<AuthDesktopVariant, AuthAccent> = {
  "linear-indigo": "indigo",
  "linear-crimson": "rose",
  "figma-sunset": "orange",
  "figma-ocean": "cyan",
  "figma-nova": "fuchsia",
  "framer-ember": "orange",
  "framer-violet": "violet",
  "supabase-grove": "emerald",
  "supabase-abyss": "teal",
  "supabase-pulse": "purple",
};

export const DARK_FORM_SKIN =
  "[&_input]:border-zinc-700 [&_input]:bg-zinc-900/80 [&_input]:text-zinc-100 [&_input]:placeholder:text-zinc-500 [&_label]:text-zinc-400 [&_button[type=button]]:text-zinc-400";

export const LIGHT_FORM_SKIN = "[&_input]:bg-[#f4f4f5] [&_input]:border-0";
