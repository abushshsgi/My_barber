/** Uzum Sellers ruhida, lekin MySaloon uchun 15 ta farqli desktop layout. */
export const AUTH_DESKTOP_VARIANTS = [
  { id: "center", label: "01", desc: "Markaziy kartochka", family: "core" },
  { id: "orbit", label: "02", desc: "Orbit nuqtalar", family: "core" },
  { id: "split-violet", label: "03", desc: "Split binafsha", family: "core" },
  { id: "split-slate", label: "04", desc: "Split kulrang", family: "core" },
  { id: "glass", label: "05", desc: "Glass effekt", family: "core" },
  { id: "minimal", label: "06", desc: "Ultra minimal", family: "tone" },
  { id: "sand", label: "07", desc: "Issiq qum", family: "tone" },
  { id: "mist", label: "08", desc: "Ko'k tuman", family: "tone" },
  { id: "plum", label: "09", desc: "Plum gradient", family: "tone" },
  { id: "indigo", label: "10", desc: "Indigo chiziq", family: "tone" },
  { id: "narrow", label: "11", desc: "Tor kompakt", family: "shape" },
  { id: "wide", label: "12", desc: "Keng panel", family: "shape" },
  { id: "ribbon", label: "13", desc: "Lenta aksent", family: "shape" },
  { id: "frame", label: "14", desc: "Ikki ramka", family: "shape" },
  { id: "glow", label: "15", desc: "Markaziy yorug'", family: "shape" },
] as const;

export type AuthDesktopVariant = (typeof AUTH_DESKTOP_VARIANTS)[number]["id"];

export const AUTH_DESKTOP_VARIANT_IDS = AUTH_DESKTOP_VARIANTS.map((v) => v.id) as [
  AuthDesktopVariant,
  ...AuthDesktopVariant[],
];

export const DEFAULT_AUTH_DESKTOP_VARIANT: AuthDesktopVariant = "center";

export function parseAuthDesktopVariant(raw: string | undefined): AuthDesktopVariant {
  const hit = AUTH_DESKTOP_VARIANTS.find((v) => v.id === raw);
  return hit?.id ?? DEFAULT_AUTH_DESKTOP_VARIANT;
}

export type AuthAccent =
  | "violet"
  | "indigo"
  | "purple"
  | "fuchsia"
  | "slate"
  | "blue"
  | "plum";

export const ACCENT_STYLES: Record<
  AuthAccent,
  { logo: string; btn: string; btnHover: string; text: string; progress: string; link: string }
> = {
  violet: {
    logo: "bg-violet-600",
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
    text: "text-violet-700",
    progress: "bg-violet-600",
    link: "text-violet-600",
  },
  indigo: {
    logo: "bg-indigo-600",
    btn: "bg-indigo-600",
    btnHover: "hover:bg-indigo-700",
    text: "text-indigo-700",
    progress: "bg-indigo-600",
    link: "text-indigo-600",
  },
  purple: {
    logo: "bg-purple-600",
    btn: "bg-purple-600",
    btnHover: "hover:bg-purple-700",
    text: "text-purple-700",
    progress: "bg-purple-600",
    link: "text-purple-600",
  },
  fuchsia: {
    logo: "bg-fuchsia-600",
    btn: "bg-fuchsia-600",
    btnHover: "hover:bg-fuchsia-700",
    text: "text-fuchsia-700",
    progress: "bg-fuchsia-600",
    link: "text-fuchsia-600",
  },
  slate: {
    logo: "bg-slate-700",
    btn: "bg-slate-800",
    btnHover: "hover:bg-slate-900",
    text: "text-slate-800",
    progress: "bg-slate-700",
    link: "text-slate-700",
  },
  blue: {
    logo: "bg-blue-600",
    btn: "bg-blue-600",
    btnHover: "hover:bg-blue-700",
    text: "text-blue-700",
    progress: "bg-blue-600",
    link: "text-blue-600",
  },
  plum: {
    logo: "bg-[#7c3aed]",
    btn: "bg-[#7c3aed]",
    btnHover: "hover:bg-[#6d28d9]",
    text: "text-[#6d28d9]",
    progress: "bg-[#7c3aed]",
    link: "text-[#7c3aed]",
  },
};
