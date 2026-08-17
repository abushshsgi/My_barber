export type MorphVoicePhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "waiting";

export function rmsToMetering(rms: number): number {
  if (rms <= 0.0001) return -160;
  return Math.max(-160, Math.min(0, 20 * Math.log10(rms)));
}

export function shouldAutoStopListening(opts: {
  metering: number;
  elapsedMs: number;
  heardSpeech: boolean;
  silentMs: number;
}): { heardSpeech: boolean; silentMs: number; stop: boolean } {
  const speaking = opts.metering > -34;
  const heardSpeech = opts.heardSpeech || (speaking && opts.elapsedMs > 480);
  const silentMs = speaking ? 0 : heardSpeech ? opts.silentMs + 120 : opts.silentMs;
  const stop = heardSpeech && silentMs >= 1400 && opts.elapsedMs >= 1100 && opts.elapsedMs < 45_000;
  return { heardSpeech, silentMs, stop };
}

export function sanitizeSpeechText(text: string, maxChars = 2500): string {
  let raw = (text || "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  raw = raw.replace(/```[\s\S]*?```/g, " ");
  raw = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  raw = raw.replace(/`([^`]+)`/g, "$1");
  raw = raw.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  raw = raw.replace(/\*\*([^*]+)\*\*/g, "$1");
  raw = raw.replace(/__([^_]+)__/g, "$1");
  raw = raw.replace(/\*([^*]+)\*/g, "$1");
  raw = raw.replace(/^\s*[-*+]\s+/gm, "");
  raw = raw.replace(/^\s*\d+\.\s+/gm, "");
  raw = raw.replace(/\*\*|__/g, "");
  raw = raw
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
  const cleaned = raw.trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
  if (end >= maxChars / 2) return cut.slice(0, end + 1).trim();
  return cut.replace(/\s+\S*$/, "").trim();
}

export function createWebRecorder(onMeter: (db: number) => void): {
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
  cancel: () => void;
} {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let ctx: AudioContext | null = null;
  let raf = 0;
  let mime = "audio/webm";

  const teardown = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) {
      void ctx.close().catch(() => undefined);
      ctx = null;
    }
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  return {
    async start() {
      chunks = [];
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      mime = candidates.find((row) => MediaRecorder.isTypeSupported(row)) ?? "audio/webm";
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };
      recorder.start(100);
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        onMeter(rmsToMetering(Math.sqrt(sum / data.length)));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },

    stop() {
      const rec = recorder;
      recorder = null;
      if (!rec || rec.state === "inactive") {
        teardown();
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        rec.onstop = () => {
          teardown();
          const blob = new Blob(chunks, { type: mime.split(";")[0] });
          chunks = [];
          resolve(blob.size < 400 ? null : blob);
        };
        try {
          rec.stop();
        } catch {
          teardown();
          resolve(null);
        }
      });
    },

    cancel() {
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      recorder = null;
      chunks = [];
      teardown();
    },
  };
}

export function playBase64Audio(
  base64: string,
  mime: string,
): {
  audio: HTMLAudioElement;
  done: Promise<void>;
} {
  const audio = new Audio(`data:${mime || "audio/wav"};base64,${base64}`);
  audio.preload = "auto";
  const done = new Promise<void>((resolve) => {
    const finish = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
  });
  return { audio, done };
}
