import type { LucideIcon } from "lucide-react";
import {
  Aperture,
  Droplets,
  Layers,
  Palette,
  Scissors,
  Sparkles,
  SunMedium,
  UserRound,
  Waves,
} from "lucide-react";

/** Category tab icon by catalog category id. */
export function studioCategoryIcon(categoryId: string): LucideIcon {
  switch (categoryId) {
    case "hair_color":
      return Palette;
    case "beard":
      return Scissors;
    case "finish":
      return Droplets;
    default:
      return Sparkles;
  }
}

/** Pictogram for non-swatch presets (beard / finish). */
export function studioPresetIcon(presetId: string): LucideIcon {
  switch (presetId) {
    case "beard_clean":
      return UserRound;
    case "beard_stubble":
      return Layers;
    case "beard_full":
      return Waves;
    case "beard_shape":
      return Scissors;
    case "finish_wet":
      return Droplets;
    case "finish_matte":
      return Layers;
    case "finish_gloss":
      return Sparkles;
    case "finish_volume":
      return Waves;
    case "finish_soft_light":
      return SunMedium;
    case "finish_sharp":
      return Aperture;
    default:
      return Sparkles;
  }
}
