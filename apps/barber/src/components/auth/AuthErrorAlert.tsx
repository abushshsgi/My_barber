import { AlertCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function AuthErrorAlert({ error }: { error: string | null }) {
  const reduceMotion = useReducedMotion();

  if (!error) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{
        opacity: 1,
        height: "auto",
        ...(reduceMotion ? {} : { x: [0, -4, 4, -4, 0] }),
      }}
      exit={{ opacity: 0, height: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.25 }}
    >
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </motion.div>
  );
}
