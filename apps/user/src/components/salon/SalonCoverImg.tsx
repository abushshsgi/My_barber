import { useEffect, useState, type ImgHTMLAttributes } from "react";
import type { Category } from "@/lib/mock-data";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  seed?: string;
  category?: Category;
};

/** Salon cover — faqat haqiqiy media; 404/bo‘shda neytral placeholder (stock yo‘q). */
export function SalonCoverImg({ src, seed: _seed, category: _category, onError, ...props }: Props) {
  const fallback = PLACEHOLDER_SALON;
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
