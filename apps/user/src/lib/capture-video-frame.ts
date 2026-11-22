/** Kamera `<video>` dan JPEG data URL (AI/rasm rejimi). */
export async function captureVideoFrameJpeg(
  video: HTMLVideoElement,
  quality = 0.88,
): Promise<string | null> {
  if (!video.videoWidth || !video.videoHeight) return null;
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", quality);
}