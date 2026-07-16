import { useEffect, useState, type ImgHTMLAttributes } from "react";
import type { Category } from "@/lib/mock-data";
import { getSalonCoverUrl, PLACEHOLDER_SALON } from "@/lib/cover-images";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  seed?: string;
  category?: Category;
};

/** Salon cover — buzilgan URL da kategoriya fallback, keyin neytral placeholder. */
export function SalonCoverImg({ src, seed, category, onError, ...props }: Props) {
  const soft = getSalonCoverUrl(seed, category);
  const [current, setCurrent] = useState(() => src?.trim() || soft);

  useEffect(() => {
    setCurrent(src?.trim() || soft);
  }, [src, soft]);

  return (
    <img
      {...props}
      src={current}
      onError={(event) => {
        if (current !== soft && current !== PLACEHOLDER_SALON) {
          setCurrent(soft);
        } else if (current !== PLACEHOLDER_SALON) {
          setCurrent(PLACEHOLDER_SALON);
        }
        onError?.(event);
      }}
    />
  );
}
