import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";

export type ScanPhase = "loading" | "searching" | "center" | "turn_left" | "turn_right" | "capture";

export type FaceLandmark = { x: number; y: number; z?: number };

/** MediaPipe face oval — yuz konturi. */
export const FACE_OVAL_IDX = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152,
  148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
] as const;

export type FaceFrameMetrics = {
  box: { x: number; y: number; width: number; height: number };
  contour: FaceLandmark[];
  yaw: number;
  faceShapeKey: FaceShapeKey;
  ratios: { widthToHeight: number; jawToForehead: number };
};

const IDX = {
  nose: 1,
  forehead: 10,
  chin: 152,
  leftCheek: 234,
  rightCheek: 454,
  jawLeft: 172,
  jawRight: 397,
} as const;

const SMOOTH_ALPHA = 0.38;

function dist(a: FaceLandmark, b: FaceLandmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function mirrorX(point: FaceLandmark): FaceLandmark {
  return { x: 1 - point.x, y: point.y, z: point.z };
}

export function contourFromLandmarks(landmarks: FaceLandmark[]): FaceLandmark[] {
  return FACE_OVAL_IDX.map((i) => landmarks[i]).filter((p): p is FaceLandmark => Boolean(p));
}

function boundsFromContour(contour: FaceLandmark[]) {
  const xs = contour.map((p) => p.x);
  const ys = contour.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

export function metricsFromLandmarks(landmarks: FaceLandmark[]): FaceFrameMetrics | null {
  if (landmarks.length < 400) return null;

  const contour = contourFromLandmarks(landmarks);
  if (contour.length < 12) return null;

  const nose = landmarks[IDX.nose];
  const forehead = landmarks[IDX.forehead];
  const chin = landmarks[IDX.chin];
  const leftCheek = landmarks[IDX.leftCheek];
  const rightCheek = landmarks[IDX.rightCheek];
  const jawLeft = landmarks[IDX.jawLeft];
  const jawRight = landmarks[IDX.jawRight];

  const faceWidth = dist(leftCheek, rightCheek);
  const faceHeight = dist(forehead, chin);
  if (faceWidth < 0.03 || faceHeight < 0.04) return null;

  const widthToHeight = faceWidth / faceHeight;
  const jawWidth = dist(jawLeft, jawRight);
  const box = boundsFromContour(contour);
  const foreheadWidth = Math.max(box.width * 0.72, 0.001);
  const jawToForehead = jawWidth / foreheadWidth;

  let faceShapeKey: FaceShapeKey = "oval";
  if (widthToHeight >= 0.9) faceShapeKey = "round";
  else if (jawToForehead >= 1.02 && widthToHeight <= 0.84) faceShapeKey = "square";

  const centerX = (leftCheek.x + rightCheek.x) / 2;
  const yaw = ((nose.x - centerX) / Math.max(faceWidth, 0.001)) * 50;

  return {
    box,
    contour,
    yaw,
    faceShapeKey,
    ratios: { widthToHeight, jawToForehead },
  };
}

export function smoothMetrics(
  prev: FaceFrameMetrics | null,
  next: FaceFrameMetrics,
): FaceFrameMetrics {
  if (!prev) return next;

  const t = SMOOTH_ALPHA;
  const box = {
    x: lerp(prev.box.x, next.box.x, t),
    y: lerp(prev.box.y, next.box.y, t),
    width: lerp(prev.box.width, next.box.width, t),
    height: lerp(prev.box.height, next.box.height, t),
  };

  const contour = next.contour.map((point, i) => {
    const old = prev.contour[i] ?? point;
    return {
      x: lerp(old.x, point.x, t),
      y: lerp(old.y, point.y, t),
      z: point.z,
    };
  });

  return {
    box,
    contour,
    yaw: lerp(prev.yaw, next.yaw, t),
    faceShapeKey: next.faceShapeKey,
    ratios: next.ratios,
  };
}

export function phaseSatisfied(phase: ScanPhase, metrics: FaceFrameMetrics): boolean {
  if (metrics.contour.length < 12) return false;

  if (phase === "center") return Math.abs(metrics.yaw) < 16;
  if (phase === "turn_left") return metrics.yaw < -11;
  if (phase === "turn_right") return metrics.yaw > 11;
  return true;
}

export function nextPhase(phase: ScanPhase): ScanPhase {
  if (phase === "searching") return "center";
  if (phase === "center") return "turn_left";
  if (phase === "turn_left") return "turn_right";
  if (phase === "turn_right") return "capture";
  return phase;
}
