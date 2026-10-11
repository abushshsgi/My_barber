import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = i + 1 < bytes.length ? (bytes[i + 1] ?? 0) : 0;
    const c = i + 2 < bytes.length ? (bytes[i + 2] ?? 0) : 0;
    const triple = (a << 16) | (b << 8) | c;
    out += B64[(triple >> 18) & 63];
    out += B64[(triple >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(triple >> 6) & 63] : "=";
    out += i + 2 < bytes.length ? B64[triple & 63] : "=";
  }
  return out;
}

/** Qisqa ikki zarbali skaner beep — supermarket barcode ovozi. */
function beepWavBase64(): string {
  const sampleRate = 22050;
  const duration = 0.22;
  const count = Math.floor(sampleRate * duration);
  const header = 44;
  const bytes = new Uint8Array(header + count * 2);
  const view = new DataView(bytes.buffer);
  const writeStr = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };
  writeStr(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, count * 2, true);

  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    let amp = 0;
    let freq = 2400;
    if (t < 0.08) {
      freq = 2300;
      amp = Math.sin((Math.PI * t) / 0.08);
    } else if (t > 0.11 && t < 0.2) {
      freq = 2800;
      amp = Math.sin((Math.PI * (t - 0.11)) / 0.09);
    }
    const sample = Math.sin(2 * Math.PI * freq * t) * amp * 0.72;
    view.setInt16(header + i * 2, Math.round(sample * 32767), true);
  }
  return bytesToBase64(bytes);
}

type WebAudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let webCtx: AudioContext | null = null;

function playWebBeep() {
  const Ctor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
  if (!Ctor) return;
  if (!webCtx) webCtx = new Ctor();
  void webCtx.resume();
  const now = webCtx.currentTime;
  const chirp = (freq: number, start: number, length: number) => {
    const osc = webCtx!.createOscillator();
    const gain = webCtx!.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain);
    gain.connect(webCtx!.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  };
  chirp(2300, now, 0.08);
  chirp(2850, now + 0.11, 0.08);
}

let nativeUri: Promise<string> | null = null;

async function nativeBeepUri(): Promise<string> {
  if (!nativeUri) {
    nativeUri = (async () => {
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
      const path = `${dir}barcode-beep.wav`;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) {
        await FileSystem.writeAsStringAsync(path, beepWavBase64(), {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      return path;
    })();
  }
  return nativeUri;
}

async function playNativeBeep() {
  try {
    const uri = await nativeBeepUri();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    const player = createAudioPlayer({ uri });
    player.volume = 1;
    player.play();
  } catch {
    /* ovoz chiqmasa skan baribir davom etadi */
  }
}

export function primeBarcodeBeep() {
  if (Platform.OS !== "web") return;
  try {
    const Ctor = window.AudioContext || (window as WebAudioWindow).webkitAudioContext;
    if (!Ctor) return;
    if (!webCtx) webCtx = new Ctor();
    void webCtx.resume();
  } catch {
    /* brauzer ovozni keyinroq ochadi */
  }
}

export function playBarcodeBeep() {
  try {
    if (Platform.OS === "web") {
      playWebBeep();
      return;
    }
    void playNativeBeep();
  } catch {
    /* ovoz chiqmasa skan baribir davom etadi */
  }
}
