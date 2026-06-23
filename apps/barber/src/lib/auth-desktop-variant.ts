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

export const AUTH_ACCENT: AuthAccent = "indigo";

/** Auth UI — tizim `primary` (qora/bej) ranglari bilan mos. */
export const AUTH_SYSTEM_STYLES = {
  logo: "bg-primary",
  btn: "bg-primary",
  btnHover: "hover:bg-primary/90",
  text: "text-primary",
  progress: "bg-primary",
  link: "text-primary hover:text-primary/80",
  ring: "ring-primary/20",
  inputFocus: "peer-focus:ring-2 peer-focus:ring-primary/20",
  focusWithin: "focus-within:ring-2 focus-within:ring-primary/20",
} as const;

export const ACCENT_STYLES: Record<
  AuthAccent,
  { logo: string; btn: string; btnHover: string; text: string; progress: string; link: string }
> = {
  indigo: {
    logo: AUTH_SYSTEM_STYLES.logo,
    btn: AUTH_SYSTEM_STYLES.btn,
    btnHover: AUTH_SYSTEM_STYLES.btnHover,
    text: AUTH_SYSTEM_STYLES.text,
    progress: AUTH_SYSTEM_STYLES.progress,
    link: AUTH_SYSTEM_STYLES.link,
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

export const ACCENT_INPUT_FOCUS: Record<AuthAccent, string> = {
  indigo: AUTH_SYSTEM_STYLES.inputFocus,
  cyan: "peer-focus:ring-2 peer-focus:ring-cyan-500/25",
  rose: "peer-focus:ring-2 peer-focus:ring-rose-500/25",
  orange: "peer-focus:ring-2 peer-focus:ring-orange-500/25",
  violet: "peer-focus:ring-2 peer-focus:ring-violet-500/25",
  purple: "peer-focus:ring-2 peer-focus:ring-purple-500/25",
  emerald: "peer-focus:ring-2 peer-focus:ring-emerald-500/25",
  teal: "peer-focus:ring-2 peer-focus:ring-teal-500/25",
  fuchsia: "peer-focus:ring-2 peer-focus:ring-fuchsia-500/25",
};

export const ACCENT_FOCUS_WITHIN: Record<AuthAccent, string> = {
  indigo: AUTH_SYSTEM_STYLES.focusWithin,
  cyan: "focus-within:ring-2 focus-within:ring-cyan-500/25",
  rose: "focus-within:ring-2 focus-within:ring-rose-500/25",
  orange: "focus-within:ring-2 focus-within:ring-orange-500/25",
  violet: "focus-within:ring-2 focus-within:ring-violet-500/25",
  purple: "focus-within:ring-2 focus-within:ring-purple-500/25",
  emerald: "focus-within:ring-2 focus-within:ring-emerald-500/25",
  teal: "focus-within:ring-2 focus-within:ring-teal-500/25",
  fuchsia: "focus-within:ring-2 focus-within:ring-fuchsia-500/25",
};

export const LIGHT_FORM_SKIN = "[&_input]:bg-[#f4f4f5] [&_input]:border-0";
