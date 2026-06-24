import { Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { FloatingInput } from "@/components/auth/FloatingInput";
import { FloatingPhoneInput } from "@/components/auth/FloatingPhoneInput";
import { PasswordStrengthInput } from "@/components/auth/PasswordStrengthInput";
import { staggerChild } from "@/lib/motion-presets";

type Props = {
  name: string;
  phone: string;
  email: string;
  password: string;
  emailError: string | null;
  phoneError: string | null;
  checkingAvailability?: boolean;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onEmailBlur: () => void;
  onPhoneBlur: () => void;
};

export function SignupStepIdentity({
  name,
  phone,
  email,
  password,
  emailError,
  phoneError,
  checkingAvailability,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onPasswordChange,
  onEmailBlur,
  onPhoneBlur,
}: Props) {
  const reduceMotion = useReducedMotion();
  const fields = [
    {
      key: "name",
      node: (
        <FloatingInput
          id="signup-name"
          label="Ism-familiya"
          value={name}
          onChange={onNameChange}
          required
        />
      ),
    },
    {
      key: "phone",
      node: (
        <FloatingPhoneInput
          id="signup-phone"
          label="Telefon raqami"
          value={phone}
          onChange={onPhoneChange}
          error={phoneError}
          onBlur={onPhoneBlur}
        />
      ),
    },
    {
      key: "email",
      node: (
        <FloatingInput
          id="signup-email"
          label="Email"
          value={email}
          onChange={onEmailChange}
          onBlur={onEmailBlur}
          type="email"
          autoComplete="email"
          error={emailError}
        />
      ),
    },
    {
      key: "password",
      node: (
        <PasswordStrengthInput
          id="signup-password"
          label="Parol"
          placeholder="8 ta belgi"
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
          required
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight sm:text-lg">Shaxsiy ma'lumotlar</h2>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Email yoki telefon — kamida bittasi. Parol faqat sizning akkauntingiz uchun.
        </p>
        {checkingAvailability && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Email va telefon tekshirilmoqda...
          </p>
        )}
      </div>
      <div className="space-y-2.5 sm:space-y-3">
        {fields.map((field, index) => (
          <motion.div key={field.key} {...staggerChild(index, !!reduceMotion)}>
            {field.node}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
