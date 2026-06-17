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
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onEmailBlur: () => void;
};

export function SignupStepIdentity({
  name,
  phone,
  email,
  password,
  emailError,
  onNameChange,
  onPhoneChange,
  onEmailChange,
  onPasswordChange,
  onEmailBlur,
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
          label="Telefon (ixtiyoriy)"
          value={phone}
          onChange={onPhoneChange}
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
          required
          error={emailError}
        />
      ),
    },
    {
      key: "password",
      node: (
        <PasswordStrengthInput
          id="signup-password"
          label="Parol (kamida 8 belgi)"
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
          showStrength
          required
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Shaxsiy ma'lumotlar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Profil va kirish uchun asosiy ma'lumotlarni kiriting.
        </p>
      </div>
      <div className="space-y-3">
        {fields.map((field, index) => (
          <motion.div key={field.key} {...staggerChild(index, !!reduceMotion)}>
            {field.node}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
