export type WalletCardVariant = "premium" | "metal" | "glass" | "retro" | "pill";

export const WALLET_CARD_VARIANTS: WalletCardVariant[] = [
  "premium",
  "metal",
  "glass",
  "retro",
  "pill",
];

export const WALLET_VARIANT_STORAGE = "mysaloon.wallet.variant";

export type WalletCardTheme = {
  id: WalletCardVariant;
  labelKey: string;
  hintKey: string;
  background: string;
  creamCap?: string;
  boxShadow: string;
  rounded: string;
  textOnDark: string;
  textMuted: string;
  panColor: string;
  chipOnDark?: boolean;
  showCreamCap: boolean;
  showMagStripe?: boolean;
  aspectClass?: string;
};

export const walletCardThemes: Record<WalletCardVariant, WalletCardTheme> = {
  premium: {
    id: "premium",
    labelKey: "walletPage.variants.premium",
    hintKey: "walletPage.plasticHint",
    background:
      "radial-gradient(circle at 0% 0%, oklch(0.32 0.09 75 / 0.55), transparent 55%), radial-gradient(circle at 110% 110%, oklch(0.32 0.09 75 / 0.4), transparent 55%), linear-gradient(135deg, oklch(0.18 0.03 260), oklch(0.12 0.02 260))",
    creamCap:
      "linear-gradient(180deg, oklch(0.99 0.01 97) 0%, oklch(0.95 0.02 90) 40%, oklch(0.9 0.03 88) 100%)",
    boxShadow:
      "0 24px 60px -18px oklch(0.06 0 0 / 0.72), 0 0 0 1px oklch(0.85 0.02 90 / 0.16) inset",
    rounded: "rounded-[26px]",
    textOnDark: "text-background",
    textMuted: "text-muted-foreground",
    panColor: "text-background/82",
    showCreamCap: true,
  },
  metal: {
    id: "metal",
    labelKey: "walletPage.variants.metal",
    hintKey: "walletPage.metalHint",
    background:
      "linear-gradient(145deg, oklch(0.78 0.02 250) 0%, oklch(0.58 0.03 255) 38%, oklch(0.42 0.04 260) 72%, oklch(0.32 0.03 265) 100%)",
    boxShadow:
      "0 28px 56px -20px oklch(0.2 0.02 260 / 0.65), inset 0 1px 0 oklch(1 0 0 / 0.35), inset 0 -1px 0 oklch(0.2 0 0 / 0.25)",
    rounded: "rounded-[22px]",
    textOnDark: "text-white",
    textMuted: "text-white/65",
    panColor: "text-white/88",
    chipOnDark: true,
    showCreamCap: false,
  },
  glass: {
    id: "glass",
    labelKey: "walletPage.variants.glass",
    hintKey: "walletPage.glassHint",
    background:
      "linear-gradient(135deg, oklch(0.92 0.04 220 / 0.55), oklch(0.72 0.08 250 / 0.35)), linear-gradient(180deg, oklch(0.98 0.02 230 / 0.4), oklch(0.55 0.12 260 / 0.5))",
    boxShadow:
      "0 24px 48px -16px oklch(0.35 0.08 260 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.45), inset 0 0 0 1px oklch(1 0 0 / 0.22)",
    rounded: "rounded-[28px]",
    textOnDark: "text-white",
    textMuted: "text-white/70",
    panColor: "text-white/90",
    chipOnDark: true,
    showCreamCap: false,
  },
  retro: {
    id: "retro",
    labelKey: "walletPage.variants.retro",
    hintKey: "walletPage.retroHint",
    background:
      "linear-gradient(160deg, oklch(0.88 0.06 85) 0%, oklch(0.72 0.08 55) 45%, oklch(0.58 0.1 42) 100%)",
    boxShadow: "0 20px 44px -18px oklch(0.35 0.08 45 / 0.45), 0 0 0 1px oklch(0.45 0.06 50 / 0.2) inset",
    rounded: "rounded-[18px]",
    textOnDark: "text-foreground",
    textMuted: "text-foreground/65",
    panColor: "text-foreground/80",
    showCreamCap: false,
    showMagStripe: true,
  },
  pill: {
    id: "pill",
    labelKey: "walletPage.variants.pill",
    hintKey: "walletPage.pillHint",
    background:
      "radial-gradient(circle at 20% 0%, oklch(0.72 0.16 290 / 0.5), transparent 50%), linear-gradient(135deg, oklch(0.42 0.14 285), oklch(0.28 0.12 270))",
    boxShadow: "0 32px 64px -24px oklch(0.25 0.12 280 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.12)",
    rounded: "rounded-[999px]",
    aspectClass: "aspect-[1.72/1]",
    textOnDark: "text-white",
    textMuted: "text-white/65",
    panColor: "text-white/85",
    chipOnDark: true,
    showCreamCap: false,
  },
};

export function readWalletVariant(): WalletCardVariant {
  if (typeof window === "undefined") return "premium";
  try {
    const stored = localStorage.getItem(WALLET_VARIANT_STORAGE);
    if (stored && WALLET_CARD_VARIANTS.includes(stored as WalletCardVariant)) {
      return stored as WalletCardVariant;
    }
  } catch {
    /* noop */
  }
  return "premium";
}

export function saveWalletVariant(variant: WalletCardVariant) {
  try {
    localStorage.setItem(WALLET_VARIANT_STORAGE, variant);
  } catch {
    /* noop */
  }
}
