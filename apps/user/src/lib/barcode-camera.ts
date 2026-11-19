export type CameraAccessReason = "ok" | "insecure" | "no-media-devices";

export function supportsBarcodeDetector(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { BarcodeDetector?: unknown }).BarcodeDetector,
  );
}

/** Camera / secure context only — not tied to BarcodeDetector. */
export function diagnoseCameraAccess(): CameraAccessReason {
  if (typeof window === "undefined") return "no-media-devices";
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "no-media-devices";
  return "ok";
}

export function cameraAccessUserMessage(
  reason: CameraAccessReason,
  lang: "uz" | "ru" | "en" = "uz",
): string {
  const messages: Record<CameraAccessReason, Record<"uz" | "ru" | "en", string>> = {
    ok: { uz: "", ru: "", en: "" },
    insecure: {
      uz: "Kamera faqat HTTPS (xavfsiz) ulanishda ishlaydi.",
      ru: "Камера работает только по защищённому HTTPS-соединению.",
      en: "Camera requires a secure HTTPS connection.",
    },
    "no-media-devices": {
      uz: "Bu brauzer kamerani qo'llab-quvvatlamaydi. Galereyadan rasm yuklang.",
      ru: "Этот браузер не поддерживает камеру. Загрузите фото из галереи.",
      en: "This browser does not support camera access. Upload from gallery.",
    },
  };
  return messages[reason][lang];
}

export async function pickPreferredVideoDeviceId(): Promise<string | undefined> {
  if (!navigator.mediaDevices?.enumerateDevices) return undefined;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videos = devices.filter((d) => d.kind === "videoinput");
  if (videos.length === 0) return undefined;
  const rear = videos.find((d) => /back|rear|environment/i.test(d.label));
  return rear?.deviceId ?? videos.at(-1)?.deviceId ?? videos[0]?.deviceId;
}

export async function openBarcodeVideoStream(): Promise<MediaStream> {
  const deviceId = await pickPreferredVideoDeviceId();
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: deviceId
      ? { deviceId: { ideal: deviceId } }
      : { facingMode: { ideal: "environment" } },
  };
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    });
  }
}