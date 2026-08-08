import { Linking, Share } from "react-native";
import { createMorphAiLookShare } from "../api/ai";

const WEB_ORIGIN = "https://www.mysaloon.uz";

export async function shareMorphLook(opts: {
  styleId: string;
  title: string;
  previewImage?: string | null;
}): Promise<void> {
  let pageUrl = `${WEB_ORIGIN}/morf-ai/look/${encodeURIComponent(opts.styleId)}`;
  if (opts.previewImage) {
    try {
      const created = await createMorphAiLookShare({
        style_id: opts.styleId,
        title: opts.title,
        after_image: opts.previewImage,
      });
      pageUrl =
        created.share_page_url ||
        `${WEB_ORIGIN}/morf-ai/share/${encodeURIComponent(created.id)}`;
    } catch {
      /* look URL fallback */
    }
  }
  const message = `${opts.title} — Morf AI da sinab ko‘ring\n${pageUrl}`;
  await Share.share({ message, url: pageUrl, title: opts.title });
}

export async function openTelegramShare(pageUrl: string, text: string): Promise<void> {
  const url = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
  await Linking.openURL(url);
}

export { WEB_ORIGIN };
