import { useEffect, useState, type ImgHTMLAttributes } from "react";
import type { Category } from "@/lib/mock-data";
import { getSalonCoverUrl } from "@/lib/cover-images";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  seed?: string;
  category?: Category;
};

/** Salon cover — 404 yoki buzilgan URL da placeholder ga o'tadi. */
export function SalonCoverImg({ src, seed, category, onError, ...props }: Props) {
  const fallback = getSalonCoverUrl(seed, category);
  const [current, setCurrent] = useState(() => src?.trim() || fallback);

  useEffect(() => {
    setCurrent(src?.trim() || fallback);
  }, [src, fallback]);

  return (
    <img
      {...props}
      src={current}
      onError={(event) => {
        if (current !== fallback) setCurrent(fallback);
        onError?.(event);
      }}
    />
  );
}
