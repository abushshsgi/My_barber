import { cn } from "@/lib/utils";

/** Hamyon kartasi — pastki qora, yuqori krem yarim (gorizontal split). */
export const walletCardStyle = {
  background: "oklch(0.145 0 0)",
  creamCap: "linear-gradient(180deg, oklch(1 0 0) 0%, oklch(0.96 0.014 88) 100%)",
  boxShadow: "0 20px 48px -14px oklch(0.1 0 0 / 0.45), 0 0 0 1px oklch(0.97 0.011 85 / 0.06) inset",
  profileShadow: "0 12px 32px -12px oklch(0.1 0 0 / 0.35)",
} as const;

export function WalletCardCreamCap({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 h-[54%] rounded-b-[30px]",
        className,
      )}
      style={{
        background: walletCardStyle.creamCap,
        boxShadow: "0 10px 28px -12px oklch(0.2 0 0 / 0.18)",
      }}
      aria-hidden
    />
  );
}

/** EMV chip — metallik korpus + kontakt panellari. */
export function WalletEmvChip({ className, onDark }: { className?: string; onDark?: boolean }) {
  return (
    <div className={cn("relative h-[30px] w-[40px] shrink-0", className)} aria-hidden>
      <div
        className="absolute inset-0 rounded-[6px] border border-[oklch(0.38_0.04_68/0.55)]"
        style={{
          background: onDark
            ? "linear-gradient(148deg, oklch(0.88 0.1 90) 0%, oklch(0.74 0.1 82) 38%, oklch(0.58 0.09 74) 100%)"
            : "linear-gradient(148deg, oklch(0.84 0.09 88) 0%, oklch(0.7 0.1 80) 38%, oklch(0.54 0.08 72) 100%)",
          boxShadow:
            "0 2px 5px oklch(0.2 0 0 / 0.35), inset 0 1px 0 oklch(0.95 0.04 92 / 0.55), inset 0 -1px 0 oklch(0.35 0.05 68 / 0.4)",
        }}
      />
      <div
        className="absolute inset-[4px] overflow-hidden rounded-[4px] border border-[oklch(0.32_0.04_65/0.45)]"
        style={{
          background: "linear-gradient(160deg, oklch(0.62 0.08 76), oklch(0.48 0.07 70))",
          boxShadow: "inset 0 1px 3px oklch(0.2 0 0 / 0.35)",
        }}
      >
        <svg viewBox="0 0 32 22" className="h-full w-full" preserveAspectRatio="none">
          <rect
            x="1"
            y="1"
            width="8"
            height="20"
            rx="0.5"
            fill="oklch(0.78 0.1 86)"
            opacity="0.9"
          />
          <rect
            x="11"
            y="1"
            width="8"
            height="20"
            rx="0.5"
            fill="oklch(0.72 0.09 84)"
            opacity="0.85"
          />
          <rect
            x="21"
            y="1"
            width="10"
            height="9"
            rx="0.5"
            fill="oklch(0.76 0.1 85)"
            opacity="0.9"
          />
          <rect
            x="21"
            y="12"
            width="10"
            height="9"
            rx="0.5"
            fill="oklch(0.68 0.09 82)"
            opacity="0.85"
          />
          <path
            d="M1 11h30M16 1v20"
            stroke="oklch(0.35 0.05 68)"
            strokeWidth="0.6"
            opacity="0.35"
          />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute left-[3px] top-[3px] h-[6px] w-[10px] rounded-sm bg-[oklch(1_0_0/0.28)]"
        aria-hidden
      />
    </div>
  );
}
