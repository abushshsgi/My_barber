import { z } from "zod";
import type { ExploreViewId } from "@/lib/explore-views";

export const fadeTypeSchema = z.enum(["Skin", "Low", "Mid", "High"]);
export const cuttingTechniqueSchema = z.enum(["Point cut", "Blunt"]);
export const bookingStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
]);

export const styleOverviewSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().min(1).max(80),
  face_shape: z.string().min(1).max(40),
});

export const sidesAndBackSchema = z.object({
  fade_type: fadeTypeSchema,
  starting_guard: z.number().min(0).max(25),
  transition_guard: z.number().min(0).max(25),
  neckline: z.string().min(1).max(80),
});

export const topSectionSchema = z.object({
  estimated_length_cm: z.number().min(0).max(40),
  cutting_technique: cuttingTechniqueSchema,
  texturizing_level: z.string().min(1).max(80),
  styling_product: z.string().min(1).max(120),
});

export const beardAndFacialHairSchema = z.object({
  present: z.boolean(),
  style: z.string().max(80).default(""),
  cheek_line: z.string().max(80).default(""),
  length_mm: z.number().min(0).max(100).default(0),
});

export const barberMasterCardSchema = z.object({
  style_overview: styleOverviewSchema,
  sides_and_back: sidesAndBackSchema,
  top_section: topSectionSchema,
  beard_and_facial_hair: beardAndFacialHairSchema,
  notes_for_barber: z.string().max(500).optional().default(""),
});

export const viewerCameraStateSchema = z.object({
  view: z.enum(["front", "left", "right", "back"]),
  mode: z.enum(["2d", "3d"]).default("2d"),
  azimuth: z.number().optional(),
  polar: z.number().optional(),
  zoom: z.number().optional(),
});

export const bookingMasterCardPayloadSchema = z.object({
  user_id: z.number().int().positive().optional(),
  barber_id: z.number().int().positive(),
  datetime: z.string().min(1),
  status: bookingStatusSchema.default("pending"),
  master_card_json: barberMasterCardSchema,
  style_preview_url: z.string().max(2000).optional().default(""),
  viewer_camera_state: viewerCameraStateSchema.optional(),
  model_3d_url: z.string().max(2000).optional().default(""),
});

export type StyleOverview = z.infer<typeof styleOverviewSchema>;
export type SidesAndBack = z.infer<typeof sidesAndBackSchema>;
export type TopSection = z.infer<typeof topSectionSchema>;
export type BeardAndFacialHair = z.infer<typeof beardAndFacialHairSchema>;
export type BarberMasterCard = z.infer<typeof barberMasterCardSchema>;
export type ViewerCameraState = z.infer<typeof viewerCameraStateSchema>;
export type BookingMasterCardPayload = z.infer<typeof bookingMasterCardPayloadSchema>;

export type MasterCardZoneKey = "sides" | "top" | "beard";

export type MasterCardZones = {
  sides: boolean;
  top: boolean;
  beard: boolean;
};

export function defaultBarberMasterCard(styleName = "Custom cut"): BarberMasterCard {
  return {
    style_overview: {
      name: styleName,
      category: "Fade",
      face_shape: "oval",
    },
    sides_and_back: {
      fade_type: "Mid",
      starting_guard: 0,
      transition_guard: 3,
      neckline: "Tapered",
    },
    top_section: {
      estimated_length_cm: 5,
      cutting_technique: "Point cut",
      texturizing_level: "Medium",
      styling_product: "Matte clay",
    },
    beard_and_facial_hair: {
      present: false,
      style: "",
      cheek_line: "",
      length_mm: 0,
    },
    notes_for_barber: "",
  };
}

export function parseBarberMasterCard(
  input: unknown,
  fallbackName = "Custom cut",
): { card: BarberMasterCard; success: boolean; error?: string } {
  const parsed = barberMasterCardSchema.safeParse(input);
  if (parsed.success) {
    return { card: parsed.data, success: true };
  }
  return {
    card: defaultBarberMasterCard(fallbackName),
    success: false,
    error: parsed.error.issues.map((i) => i.message).join("; ") || "Invalid master card",
  };
}

export function zonesFromMasterCard(card: BarberMasterCard): MasterCardZones {
  return {
    sides: true,
    top: true,
    beard: Boolean(card.beard_and_facial_hair.present),
  };
}

export function viewLabelKey(view: ExploreViewId): string {
  return `barberConsult.views.${view}`;
}
