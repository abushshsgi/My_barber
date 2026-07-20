import { AnimatePresence, motion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";

const STEP_TITLES = [
  "Biznes turini tanlang",
  "Yo'lingizni tanlang",
  "Ma'lumotlaringiz",
  "Ma'lumotlarni tekshiring",
] as const;

type Props = {
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
  /** title | hero — katta chap sarlavha */
  size?: "title" | "hero" | "compact";
  className?: string;
  dark?: boolean;
};

export function AuthDesktopCardTitle({
  tab,
  signupStep,
  flow,
  size = "title",
  className,
  dark = false,
}: Props) {
  const loginTitle = "Kabinetga kirish";
  const signupTitle =
    signupStep >= 0 && signupStep < STEP_TITLES.length
      ? STEP_TITLES[signupStep]
      : "Hisob yarating";

  const subtitle =
    tab === "login"
      ? "Email va parolingiz bilan davom eting"
      : signupStep === 0
        ? "Sartaroshxona yoki go'zallik saloni"
        : signupStep === 1
          ? "Salon egasi, ishchi yoki mustaqil barber"
          : signupStep === 2 && flow
            ? FLOW_IDENTITY_META[flow].signupNextStep
            : signupStep === 3
              ? "Hammasi to'g'ri bo'lsa, davom eting"
              : undefined;

  const titleClass =
    size === "hero"
      ? "text-4xl font-bold tracking-tight lg:text-5xl"
      : size === "compact"
        ? "text-lg font-semibold"
        : "text-xl font-bold tracking-tight md:text-2xl";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${tab}-${signupStep}-${flow ?? "x"}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        <h1
          className={`${titleClass} leading-snug ${dark ? "text-white" : "text-foreground"}`}
        >
          {tab === "login" ? loginTitle : signupTitle}
        </h1>
        {subtitle ? (
          <p
            className={`mt-2 text-sm leading-relaxed ${dark ? "text-zinc-400" : "text-muted-foreground"}`}
          >
            {subtitle}
          </p>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
