import { MYSALOON_DOT } from "@/components/brand/MysaloonLogo";
import { cn } from "@/lib/utils";

type Props = {
  size?: number;
  className?: string;
  /** Dark mark on light surface (header). */
  tone?: "onDark" | "onLight";
  /** Brand PNG (`/app-icon.png`) — splash/header. */
  useImage?: boolean;
};

/**
 * App monogram — web wordmarkdan farqli.
 * PNG (`/app-icon.png`) yoki CSS M+dot.
 */
export function MysaloonAppMark({
  size = 36,
  className,
  tone = "onDark",
  useImage = false,
}: Props) {
  if (useImage) {
    return (
      <img
        src="/app-icon.png"
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-[22%] object-cover", className)}
        style={{ width: size, height: size }}
        draggable={false}
        aria-hidden
      />
    );
  }

  const dark = tone === "onDark";
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[22%]",
        dark ? "bg-[#171512] text-white" : "bg-foreground text-background",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="font-extrabold leading-none tracking-tight"
        style={{ fontSize: size * 0.48 }}
      >
        M
      </span>
      <span
        className="absolute rounded-full"
        style={{
          width: size * 0.14,
          height: size * 0.14,
          backgroundColor: MYSALOON_DOT,
          right: size * 0.18,
          bottom: size * 0.2,
        }}
      />
    </span>
  );
}
