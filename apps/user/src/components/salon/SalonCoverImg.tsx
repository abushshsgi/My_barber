import { useEffect, useState, type ImgHTMLAttributes } from "react";
import type { Category } from "@/lib/mock-data";
import { PLACEHOLDER_SALON } from "@/lib/cover-images";
import { mediaUrlCandidates } from "@/lib/salon-images";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  seed?: string;
  category?: Category;
};

/** Salon cover — faqat haqiqiy media; 404 da alternativ URL, keyin placeholder. */
export function SalonCoverImg({ src, seed: _seed, category: _category, onError, ...props }: Props) {
  const fallback = PLACEHOLDER_SALON;
  const candidates = mediaUrlCandidates(src?.trim() || "");
  const [current, setCurrent] = useState(() => candidates[0] || fallback);

  useEffect(() => {
    const next = mediaUrlCandidates(src?.trim() || "");
    setCurrent(next[0] || fallback);
  }, [src, fallback]);

  return (
    <img
      {...props}
      src={current}
      onError={(event) => {
        const all = mediaUrlCandidates(src?.trim() || "");
        const at = all.indexOf(current);
        const next = at >= 0 ? all[at + 1] : all[0];
        if (next && next !== current) {
          setCurrent(next);
        } else if (current !== fallback) {
          setCurrent(fallback);
        }
        onError?.(event);
      }}
    />
  );
}
