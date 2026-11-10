import { pexelsCoverSrcSet, pexelsCoverUrl } from "@/lib/cover-images";

type Props = {
  photoId: number;
  /** First visible carousel slide — LCP candidate. */
  priority?: boolean;
  className?: string;
};

/** Hero / promo carousel image — responsive Pexels, correct LCP loading. */
export function PexelsBannerImage({ photoId, priority = false, className }: Props) {
  return (
    <img
      src={pexelsCoverUrl(photoId, priority ? 720 : 560)}
      srcSet={pexelsCoverSrcSet(photoId)}
      sizes="(max-width: 768px) 100vw, min(1200px, 72vw)"
      alt=""
      width={1200}
      height={520}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      referrerPolicy="no-referrer"
      className={className}
    />
  );
}
