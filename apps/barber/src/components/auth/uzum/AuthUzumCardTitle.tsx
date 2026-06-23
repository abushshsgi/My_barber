import { AnimatePresence, motion } from "framer-motion";
import type { SignupFlow } from "@/lib/auth-ui";
import { FLOW_IDENTITY_META } from "@/lib/barber-flow-config";

const STEP_TITLES = ["Yo'lingizni tanlang", "Ma'lumotlaringiz", "Tekshirish"] as const;

type Props = {
  tab: "login" | "signup";
  signupStep: number;
  flow: SignupFlow | null;
};

export function AuthUzumCardTitle({ tab, signupStep, flow }: Props) {
  const loginTitle = "MySaloon Partner kabinetiga kirish";
  const signupTitle =
    signupStep === 0
      ? "Ro'yxatdan o'ting"
      : signupStep === 1
        ? STEP_TITLES[1]
        : flow
          ? FLOW_IDENTITY_META[flow].signupTitle
          : STEP_TITLES[2];

  const subtitle =
    tab === "login"
      ? "Email va parolingiz bilan kiring"
      : signupStep === 0
        ? "Salon egasi, ishchi yoki mustaqil barber — bir necha daqiqada"
        : signupStep === 1 && flow
          ? FLOW_IDENTITY_META[flow].signupNextStep
          : flow
            ? FLOW_IDENTITY_META[flow].successBody
            : undefined;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${tab}-${signupStep}-${flow ?? "x"}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold leading-snug tracking-tight text-foreground md:text-[1.35rem]">
          {tab === "login" ? loginTitle : signupTitle}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
