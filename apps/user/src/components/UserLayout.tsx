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
  /** Match luxury floating dock height (~ pb-28) + safe area */
  const contentPaddingClass = hideBottomNav
    ? ""
    : "pb-[calc(7rem+env(safe-area-inset-bottom,0px))]";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
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
