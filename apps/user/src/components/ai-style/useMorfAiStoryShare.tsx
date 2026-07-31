import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  handleInstagramStoryShare,
  InstagramShareModal,
  type InstagramStoryShareResult,
} from "@/components/ai-style/InstagramShareModal";
import { createMorphAiLookShare } from "@/lib/api";
import { toShareImageSource } from "@/lib/media-url";
import { composeMorfAiStoryImage } from "@/lib/morf-ai-story-image";
import {
  buildStoryCta,
  buildStoryEyebrow,
  buildStoryHeadline,
  buildStoryMentionHint,
  buildStorySubline,
  MORF_AI_INSTAGRAM,
  MORF_AI_SITE,
  resolveSharerFirstName,
} from "@/lib/morph-share-copy";

export type MorfAiStoryShareInput = {
  styleId: string;
  title: string;
  /** Tayyor natija rasmi (after). */
  imageUrl: string;
};

/**
 * Morf AI natijasini Instagram Story shabloniga aylantirib ulashish.
 *
 * Shablon: Mysaloon logo + «MORF AI» chip, ism bilan marketing sarlavha,
 * @morf.ai belgilash uchun bo‘sh joy va «o‘zingizda sinab ko‘ring» CTA.
 */
export function useMorfAiStoryShare() {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<InstagramStoryShareResult["mode"]>("download-fallback");

  const shareToStory = useCallback(
    async (input: MorfAiStoryShareInput) => {
      if (!input.imageUrl) {
        toast.error(t("aiStylePage.previewNoImage"));
        return;
      }
      setSharing(true);
      try {
        // Faqat tayyor natija (after) — before/after emas.
        const afterSource = toShareImageSource(input.imageUrl);
        let pageUrl = `${window.location.origin}/explore/${encodeURIComponent(input.styleId)}`;
        let sharerName = "";
        try {
          const created = await createMorphAiLookShare({
            style_id: input.styleId,
            title: input.title,
            after_image: afterSource,
          });
          pageUrl =
            created.share_page_url ||
            `${window.location.origin}/morf-ai/share/${encodeURIComponent(created.id)}`;
          sharerName = created.sharer_name || "";
        } catch {
          // Look-share xato bo‘lsa ham Story shablon + fallback havola ishlaydi.
        }

        const storyImage = await composeMorfAiStoryImage({
          resultImageUrl: afterSource,
          styleTitle: input.title,
          userName: resolveSharerFirstName(sharerName),
          headline: buildStoryHeadline(t, { name: sharerName, style: input.title }),
          subline: buildStorySubline(t, input.title),
          eyebrowLabel: buildStoryEyebrow(t),
          brandLabel: "Morf AI",
          siteLabel: MORF_AI_SITE,
          mentionHandle: MORF_AI_INSTAGRAM,
          mentionHint: buildStoryMentionHint(t),
          ctaLabel: buildStoryCta(t),
        });

        const result = await handleInstagramStoryShare({
          shareLink: pageUrl,
          imageUrl: storyImage,
          filename: "morf-ai-story.jpg",
        });
        if (result.mode === "cancelled") return;
        setMode(result.mode);
        setModalOpen(true);
      } catch {
        toast.error(
          t("aiStylePage.instagramStory.failed", {
            defaultValue: "Instagram Story uchun tayyorlab bo‘lmadi",
          }),
        );
      } finally {
        setSharing(false);
      }
    },
    [t],
  );

  const storyModal = (
    <InstagramShareModal open={modalOpen} onOpenChange={setModalOpen} mode={mode} />
  );

  return { sharing, shareToStory, storyModal };
}
