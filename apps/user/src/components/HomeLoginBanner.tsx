"use client";

import { useEffect, useState } from "react";
import { Link } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/api";

const STORAGE_KEY = "mybarber_dismiss_login_banner";

export function HomeLoginBanner() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const sync = () => {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
      setVisible(!getAccessToken() && !dismissed);
    };
    sync();
    window.addEventListener("focus", sync);
    return () => window.removeEventListener("focus", sync);
  }, []);

  if (!mounted || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="relative z-50 mx-4 mt-3 mb-1 rounded-2xl border border-accent/25 bg-card/95 backdrop-blur-md shadow-lg shadow-black/20"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Bron qilish uchun tizimga kiring</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Bandlar faqat akkaunt orqali — xavfsiz va qulay.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 rounded-xl gold-gradient text-gold-foreground border-0 font-semibold"
          >
            <Link href="/auth?next=/">
              <LogIn className="h-4 w-4 mr-1.5" />
              Kirish
            </Link>
          </Button>
          <button
            type="button"
            aria-label="Yopish"
            className="shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, "1");
              setVisible(false);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
