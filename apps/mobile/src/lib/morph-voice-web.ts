/** Expo web — MediaRecorder + AnalyserNode (expo-av metering webda ishlamaydi). */

export function rmsToMetering(rms: number): number {
  if (rms <= 0.0001) return -160;
  return Math.max(-160, Math.min(0, 20 * Math.log10(rms)));
}

export async function blobFromUri(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Ovoz fayli o'qilmadi");
  return res.blob();
}

export function playHtmlAudio(base64: string, mime: string): {
  audio: HTMLAudioElement;
  done: Promise<void>;
} {
  const url = `data:${mime || "audio/wav"};base64,${base64}`;
  const audio = new Audio(url);
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

type WebRecResult = { blob: Blob; uri: string; mime: string };

export function createWebRecorder(onMeter: (db: number) => void): {
  start: () => Promise<void>;
  stop: () => Promise<WebRecResult | null>;
  cancel: () => void;
} {
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let chunks: Blob[] = [];
  let ctx: AudioContext | null = null;
  let raf = 0;
  let mime = "audio/webm";

  const teardownMeter = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ctx) {
      void ctx.close().catch(() => undefined);
      ctx = null;
    }
  };

  const stopTracks = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  const pickMime = () => {
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
    for (const row of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(row)) {
        return row;
      }
    }
    return "audio/webm";
  };

  return {
    async start() {
      chunks = [];
      mime = pickMime();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      recorder = new MediaRecorder(stream, { mimeType: mime });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
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
      teardownMeter();
      const rec = recorder;
      recorder = null;
      if (!rec || rec.state === "inactive") {
        stopTracks();
        return Promise.resolve(null);
      }
      return new Promise((resolve) => {
        rec.onstop = () => {
          stopTracks();
          const blob = new Blob(chunks, { type: mime.split(";")[0] });
          chunks = [];
          if (blob.size < 400) {
            resolve(null);
            return;
          }
          resolve({
            blob,
            uri: URL.createObjectURL(blob),
            mime: blob.type || "audio/webm",
          });
        };
        try {
          rec.stop();
        } catch {
          stopTracks();
          resolve(null);
        }
      });
    },

    cancel() {
      teardownMeter();
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      recorder = null;
      chunks = [];
      stopTracks();
    },
  };
}
