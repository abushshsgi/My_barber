import type { FaceShapeKey } from "@/components/ai-style/ai-style-shared";

export type ScanPhase = "loading" | "searching" | "center" | "turn_left" | "turn_right" | "capture";

export type FaceLandmark = { x: number; y: number; z?: number };

export type FaceFrameMetrics = {
  box: { x: number; y: number; width: number; height: number };
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

function dist(a: FaceLandmark, b: FaceLandmark) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

export function metricsFromLandmarks(landmarks: FaceLandmark[]): FaceFrameMetrics | null {
  if (landmarks.length < 400) return null;

  const nose = landmarks[IDX.nose];
  const forehead = landmarks[IDX.forehead];
  const chin = landmarks[IDX.chin];
  const leftCheek = landmarks[IDX.leftCheek];
  const rightCheek = landmarks[IDX.rightCheek];
  const jawLeft = landmarks[IDX.jawLeft];
  const jawRight = landmarks[IDX.jawRight];

  const xs = landmarks.map((p) => p.x);
  const ys = landmarks.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const faceWidth = dist(leftCheek, rightCheek);
  const faceHeight = dist(forehead, chin);
  if (faceWidth < 0.04 || faceHeight < 0.05) return null;

  const widthToHeight = faceWidth / faceHeight;
  const jawWidth = dist(jawLeft, jawRight);
  const foreheadWidth = dist(
    { x: minX + (maxX - minX) * 0.2, y: forehead.y },
    { x: maxX - (maxX - minX) * 0.2, y: forehead.y },
  );
  const jawToForehead = jawWidth / Math.max(foreheadWidth, 0.001);

  let faceShapeKey: FaceShapeKey = "oval";
  if (widthToHeight >= 0.92) faceShapeKey = "round";
  else if (jawToForehead >= 1.05 && widthToHeight <= 0.82) faceShapeKey = "square";

  const centerX = (leftCheek.x + rightCheek.x) / 2;
  const yaw = ((nose.x - centerX) / Math.max(faceWidth, 0.001)) * 55;

  return {
    box: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    yaw,
    faceShapeKey,
    ratios: { widthToHeight, jawToForehead },
  };
}

export function phaseSatisfied(phase: ScanPhase, metrics: FaceFrameMetrics): boolean {
  const centered = Math.abs(metrics.yaw) < 14;
  const sized =
    metrics.box.width > 0.22 && metrics.box.height > 0.28 && metrics.box.width < 0.92;

  if (phase === "center") return centered && sized;
  if (phase === "turn_left") return metrics.yaw < -16 && sized;
  if (phase === "turn_right") return metrics.yaw > 16 && sized;
  return sized;
}

export function nextPhase(phase: ScanPhase): ScanPhase {
  if (phase === "searching") return "center";
  if (phase === "center") return "turn_left";
  if (phase === "turn_left") return "turn_right";
  if (phase === "turn_right") return "capture";
  return phase;
}
