import { pexelsPhotoUrl } from "../../api/media";

const SITE = "https://www.mysaloon.uz";

/** Morf AI persona uslublari (Explore). */
const MORPH_AI = [
  `${SITE}/hairstyles/men/personas/irland/mid-fade.webp`,
  `${SITE}/hairstyles/men/personas/irland/textured-crop.webp`,
  `${SITE}/hairstyles/men/personas/irland/curly-flow.webp`,
  `${SITE}/hairstyles/men/personas/irland/modern-mullet.webp`,
  `${SITE}/hairstyles/men/personas/niki/skin-fade.webp`,
  `${SITE}/hairstyles/men/personas/niki/pompadour.webp`,
  `${SITE}/hairstyles/men/personas/evro/undercut.webp`,
  `${SITE}/hairstyles/men/personas/britan/french-crop.webp`,
  `${SITE}/hairstyles/men/personas/slavyan/low-fade.webp`,
  `${SITE}/hairstyles/men/personas/fransuz/slick-back.webp`,
  `${SITE}/hairstyles/men/personas/irland/drop-fade-curly.webp`,
  `${SITE}/hairstyles/men/personas/irland/curly-wolf-cut.webp`,
] as const;

/** Sartarosh / salon atmosferasi (Pexels). */
const BARBERS = [
  pexelsPhotoUrl(3998429, 480),
  pexelsPhotoUrl(1813272, 480),
  pexelsPhotoUrl(1570807, 480),
  pexelsPhotoUrl(1319460, 480),
  pexelsPhotoUrl(3993449, 480),
  pexelsPhotoUrl(897262, 480),
] as const;

export type WelcomeTile = {
  uri: string;
  /** 0 = past, 1 = o'rta, 2 = baland */
  size: 0 | 1 | 2;
};

function tile(uri: string, size: 0 | 1 | 2): WelcomeTile {
  return { uri, size };
}

/** Uchta ustun — Morf AI + sartarosh rasmlari aralash. */
export const WELCOME_COLUMNS: WelcomeTile[][] = [
  [
    tile(MORPH_AI[0], 2),
    tile(BARBERS[0], 1),
    tile(MORPH_AI[1], 2),
    tile(BARBERS[1], 0),
    tile(MORPH_AI[2], 1),
    tile(BARBERS[2], 2),
  ],
  [
    tile(BARBERS[3], 1),
    tile(MORPH_AI[3], 2),
    tile(MORPH_AI[4], 0),
    tile(BARBERS[4], 2),
    tile(MORPH_AI[5], 1),
    tile(MORPH_AI[6], 2),
  ],
  [
    tile(MORPH_AI[7], 2),
    tile(BARBERS[5], 0),
    tile(MORPH_AI[8], 1),
    tile(MORPH_AI[9], 2),
    tile(MORPH_AI[10], 1),
    tile(MORPH_AI[11], 2),
  ],
];
