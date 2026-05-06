"use client";

import { UserBottomNav } from "./UserBottomNav";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "@/navigation";
import { useUserNotificationWs } from "@/hooks/useUserNotificationWs";

export function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  useUserNotificationWs();
  const hideBottomNav = pathname.startsWith("/auth");
  const contentPaddingClass = hideBottomNav
    ? ""
    : "pb-[calc(3.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(4rem+env(safe-area-inset-bottom))]";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <AnimatePresence mode="wait">
        <motion.main
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? false : { opacity: 0, x: -8 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
          className={contentPaddingClass}
        >
          {children}
        </motion.main>
      </AnimatePresence>
      {!hideBottomNav ? <UserBottomNav /> : null}
    </div>
  );
}
