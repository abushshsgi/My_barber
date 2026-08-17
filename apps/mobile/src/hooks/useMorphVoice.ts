import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  MorphPlanLimitError,
  speakMorphVoice,
  transcribeMorphVoice,
} from "../api/ai";
import {
  readMorphChatPrefs,
  type MorphChatPrefs,
  type MorphVoiceId,
} from "../lib/morph-chat-prefs";
import {
  recordingMime,
  sanitizeSpeechText,
  shouldAutoStopListening,
  speechLangTag,
} from "../lib/morph-voice";
import { createWebRecorder, playHtmlAudio } from "../lib/morph-voice-web";

export type MorphVoicePhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "waiting";

type SendResult = "ok" | "limit" | "error" | undefined;

type Args = {
  sendText: (text: string, options?: { voice?: boolean }) => Promise<SendResult>;
  lastReply: () => string;
  requireAccess: (draft?: string) => Promise<boolean>;
  onLimit: (draft?: string) => void;
  onOpenChat?: () => void;
};

const RECORD_OPTS = {
  ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const MIN_RECORD_MS = 520;
const NEXT_TURN_MS = 420;

export function useMorphVoice({
  sendText,
  lastReply,
  requireAccess,
  onLimit,
  onOpenChat,
}: Args) {
  const [phase, setPhase] = useState<MorphVoicePhase>("idle");
  const [live, setLive] = useState(false);
  const [metering, setMetering] = useState(-160);
  const meteringRef = useRef(-160);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const pushMeter = useCallback((db: number) => {
    meteringRef.current = db;
    setMetering(db);
  }, []);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const webRecRef = useRef<ReturnType<typeof createWebRecorder> | null>(null);
  const liveRef = useRef(false);
  const phaseRef = useRef<MorphVoicePhase>("idle");
  const cancelledRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextTurnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heardRef = useRef(false);
  const silentRef = useRef(0);
  const startedAtRef = useRef(0);
  const prefsRef = useRef<MorphChatPrefs | null>(null);
  const startListeningRef = useRef<() => Promise<void>>(async () => undefined);

  const setPhaseSafe = useCallback((next: MorphVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (nextTurnRef.current) {
      clearTimeout(nextTurnRef.current);
      nextTurnRef.current = null;
    }
  }, []);

  const unloadSound = useCallback(async () => {
    const html = htmlAudioRef.current;
    htmlAudioRef.current = null;
    if (html) {
      try {
        html.pause();
        html.src = "";
      } catch {
        /* ignore */
      }
    }
    const sound = soundRef.current;
    soundRef.current = null;
    if (sound) {
      try {
        await sound.stopAsync();
      } catch {
        /* ignore */
      }
      try {
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    }
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const stopRecordingInternal = useCallback(async (): Promise<{
    uri: string | null;
    blob?: Blob;
    mime?: string;
  }> => {
    stopPoll();
    if (Platform.OS === "web" && webRecRef.current) {
      const rec = webRecRef.current;
      webRecRef.current = null;
      const result = await rec.stop();
      setMetering(-160);
      if (!result) return { uri: null };
      return { uri: result.uri, blob: result.blob, mime: result.mime };
    }
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return { uri: null };
    try {
      await rec.stopAndUnloadAsync();
    } catch {
      /* already stopped */
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      /* ignore */
    }
    setMetering(-160);
    return { uri: rec.getURI() };
  }, [stopPoll]);

  const cancelSession = useCallback(async () => {
    cancelledRef.current = true;
    liveRef.current = false;
    setLive(false);
    setError(null);
    webRecRef.current?.cancel();
    webRecRef.current = null;
    await stopRecordingInternal();
    await unloadSound();
    setPhaseSafe("idle");
    setMetering(-160);
  }, [setPhaseSafe, stopRecordingInternal, unloadSound]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopPoll();
      webRecRef.current?.cancel();
      void stopRecordingInternal();
      void unloadSound();
    };
  }, [stopPoll, stopRecordingInternal, unloadSound]);

  const loadPrefs = useCallback(async () => {
    const prefs = await readMorphChatPrefs();
    prefsRef.current = prefs;
    return prefs;
  }, []);

  const speakWithDevice = useCallback(async (text: string, lang: string) => {
    const spoken = sanitizeSpeechText(text);
    if (!spoken) return;
    if (Platform.OS === "web" && typeof window !== "undefined" && window.speechSynthesis) {
      await new Promise<void>((resolve) => {
        const utter = new SpeechSynthesisUtterance(spoken);
        utter.lang = speechLangTag(lang);
        utter.rate = 0.96;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      });
      return;
    }
    await new Promise<void>((resolve) => {
      Speech.speak(spoken, {
        language: speechLangTag(lang),
        rate: 0.96,
        pitch: 1,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }, []);

  const playServerAudio = useCallback(
    async (base64: string, mime: string) => {
      if (Platform.OS === "web") {
        const { audio, done } = playHtmlAudio(base64, mime);
        htmlAudioRef.current = audio;
        await audio.play();
        await done;
        htmlAudioRef.current = null;
        return;
      }
      const ext = mime.includes("mpeg") || mime.includes("mp3") ? "mp3" : "wav";
      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
      const path = `${dir}morph-tts-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: path },
        { shouldPlay: true, volume: 1 },
      );
      soundRef.current = sound;
      await new Promise<void>((resolve) => {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) resolve();
        });
      });
      await unloadSound();
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
    },
    [unloadSound],
  );

  const speakText = useCallback(
    async (text: string) => {
      const spoken = sanitizeSpeechText(text);
      if (!spoken || cancelledRef.current) return;
      const prefs = prefsRef.current ?? (await loadPrefs());
      setReply(spoken);
      setPhaseSafe("speaking");
      await unloadSound();
      try {
        let res;
        try {
          res = await speakMorphVoice({
            text: spoken,
            voiceId: prefs.voiceId,
            gender: prefs.voiceGender,
            lang: prefs.voiceLang,
          });
        } catch {
          res = await speakMorphVoice({
            text: spoken,
            voiceId: prefs.voiceId,
            gender: prefs.voiceGender,
            lang: prefs.voiceLang,
          });
        }
        if (cancelledRef.current) return;
        await playServerAudio(res.audioBase64, res.mime);
      } catch {
        if (cancelledRef.current) return;
        const lang =
          prefs.voiceLang === "auto"
            ? prefs.replyLang === "ru"
              ? "ru"
              : "uz"
            : prefs.voiceLang;
        await speakWithDevice(spoken, lang);
      } finally {
        if (!cancelledRef.current && phaseRef.current === "speaking") {
          setPhaseSafe(liveRef.current ? "waiting" : "idle");
        }
      }
    },
    [loadPrefs, playServerAudio, setPhaseSafe, speakWithDevice, unloadSound],
  );

  const previewVoice = useCallback(
    async (voiceId: MorphVoiceId, sample: string) => {
      setPreviewing(true);
      setError(null);
      cancelledRef.current = false;
      const prefs = await loadPrefs();
      prefsRef.current = { ...prefs, voiceId };
      try {
        await speakText(sample);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ovoz sinovdan o'tmadi");
      } finally {
        setPreviewing(false);
      }
    },
    [loadPrefs, speakText],
  );

  const scheduleNextListen = useCallback(() => {
    if (!liveRef.current || cancelledRef.current) {
      if (!cancelledRef.current) setPhaseSafe("idle");
      return;
    }
    setPhaseSafe("waiting");
    nextTurnRef.current = setTimeout(() => {
      nextTurnRef.current = null;
      if (liveRef.current && !cancelledRef.current) {
        void startListeningRef.current();
      }
    }, NEXT_TURN_MS);
  }, [setPhaseSafe]);

  const finishTurn = useCallback(
    async (captured: { uri: string | null; blob?: Blob; mime?: string }) => {
      if (!captured.uri || cancelledRef.current) {
        if (liveRef.current && !cancelledRef.current) {
          scheduleNextListen();
        } else {
          setPhaseSafe("idle");
        }
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed < MIN_RECORD_MS) {
        setError("Yana bir oz gapiring.");
        if (liveRef.current) {
          scheduleNextListen();
        } else {
          setPhaseSafe("idle");
        }
        return;
      }
      const prefs = prefsRef.current ?? (await loadPrefs());
      setPhaseSafe("transcribing");
      try {
        const uriLower = captured.uri.toLowerCase();
        const guessed = captured.mime
          ? {
              mime: captured.mime,
              extension: captured.mime.includes("webm") ? "webm" : "m4a",
            }
          : uriLower.endsWith(".webm")
            ? { extension: "webm", mime: "audio/webm" }
            : uriLower.endsWith(".3gp")
              ? { extension: "3gp", mime: "audio/3gpp" }
              : recordingMime();
        const result = await transcribeMorphVoice({
          uri: captured.uri,
          blob: captured.blob,
          name: `speech.${guessed.extension}`,
          mime: guessed.mime,
          lang: prefs.voiceLang,
        });
        if (captured.uri.startsWith("blob:")) {
          URL.revokeObjectURL(captured.uri);
        }
        if (cancelledRef.current) return;
        const text = result.text.trim();
        if (!text) {
          setError("Ovoz aniqlanmadi. Qayta gapiring.");
          if (liveRef.current) scheduleNextListen();
          else setPhaseSafe("idle");
          return;
        }
        setTranscript(text);
        setError(null);
        onOpenChat?.();
        setPhaseSafe("thinking");
        const sent = await sendText(text, { voice: true });
        if (cancelledRef.current) return;
        if (sent === "limit") {
          onLimit(text);
          setPhaseSafe("idle");
          liveRef.current = false;
          setLive(false);
          return;
        }
        if (sent !== "ok") {
          if (liveRef.current) scheduleNextListen();
          else setPhaseSafe("idle");
          return;
        }
        const answer = lastReply();
        setReply(answer);
        if (liveRef.current || prefs.autoSpeak) {
          await speakText(answer);
        } else {
          setPhaseSafe("idle");
        }
        if (liveRef.current && !cancelledRef.current) {
          scheduleNextListen();
        }
      } catch (err) {
        if (err instanceof MorphPlanLimitError) {
          onLimit();
          liveRef.current = false;
          setLive(false);
        } else {
          setError(err instanceof Error ? err.message : "Ovoz ishlamadi");
        }
        if (liveRef.current && !(err instanceof MorphPlanLimitError)) {
          scheduleNextListen();
        } else {
          setPhaseSafe("idle");
        }
      }
    },
    [lastReply, loadPrefs, onLimit, onOpenChat, scheduleNextListen, sendText, setPhaseSafe, speakText],
  );

  const startListening = useCallback(async () => {
    if (phaseRef.current === "recording") return;
    cancelledRef.current = false;
    setError(null);
    const prefs = await loadPrefs();
    if (!prefs.voiceInput) return;
    const ok = await requireAccess();
    if (!ok) return;
    await unloadSound();
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* ignore */
      }
    }
    heardRef.current = false;
    silentRef.current = 0;
    startedAtRef.current = Date.now();
    meteringRef.current = -160;
    setMetering(-160);

    if (Platform.OS === "web") {
      const webRec = createWebRecorder(pushMeter);
      webRecRef.current = webRec;
      try {
        await webRec.start();
      } catch {
        setError("Mikrofon ruxsati berilmagan.");
        webRecRef.current = null;
        return;
      }
      setPhaseSafe("recording");
      stopPoll();
      pollRef.current = setInterval(() => {
        void (async () => {
          const elapsed = Date.now() - startedAtRef.current;
          const next = shouldAutoStopListening({
            metering: meteringRef.current,
            elapsedMs: elapsed,
            heardSpeech: heardRef.current,
            silentMs: silentRef.current,
          });
          heardRef.current = next.heardSpeech;
          silentRef.current = next.silentMs;
          if (elapsed >= 45_000 || next.stop) {
            const captured = await stopRecordingInternal();
            await finishTurn(captured);
          }
        })();
      }, 120);
      return;
    }

    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      setError("Mikrofon ruxsati berilmagan.");
      return;
    }
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });
    const rec = new Audio.Recording();
    await rec.prepareToRecordAsync(RECORD_OPTS);
    recordingRef.current = rec;
    await rec.startAsync();
    setPhaseSafe("recording");
    stopPoll();
    pollRef.current = setInterval(() => {
      void (async () => {
        const current = recordingRef.current;
        if (!current) return;
        try {
          const status = await current.getStatusAsync();
          if (!status.isRecording) return;
          const elapsed = Date.now() - startedAtRef.current;
          const next = shouldAutoStopListening({
            metering: status.metering,
            elapsedMs: elapsed,
            heardSpeech: heardRef.current,
            silentMs: silentRef.current,
          });
          heardRef.current = next.heardSpeech;
          silentRef.current = next.silentMs;
          if (typeof status.metering === "number") pushMeter(status.metering);
          if (elapsed >= 45_000 || next.stop) {
            const captured = await stopRecordingInternal();
            await finishTurn(captured);
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 120);
  }, [
    finishTurn,
    loadPrefs,
    pushMeter,
    requireAccess,
    setPhaseSafe,
    stopPoll,
    stopRecordingInternal,
    unloadSound,
  ]);
  startListeningRef.current = startListening;

  const stopListening = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    const captured = await stopRecordingInternal();
    await finishTurn(captured);
  }, [finishTurn, stopRecordingInternal]);

  const toggleMic = useCallback(async () => {
    if (phaseRef.current === "recording") {
      await stopListening();
      return;
    }
    if (phaseRef.current !== "idle" && phaseRef.current !== "waiting") {
      await cancelSession();
      return;
    }
    cancelledRef.current = false;
    liveRef.current = true;
    setLive(true);
    setTranscript("");
    setReply("");
    await startListening();
  }, [cancelSession, startListening, stopListening]);

  const startLive = useCallback(async () => {
    cancelledRef.current = false;
    liveRef.current = true;
    setLive(true);
    setTranscript("");
    setReply("");
    await startListening();
  }, [startListening]);

  const interruptSpeech = useCallback(async () => {
    await unloadSound();
    if (liveRef.current) {
      await startListening();
    } else {
      setPhaseSafe("idle");
    }
  }, [setPhaseSafe, startListening, unloadSound]);

  return {
    phase,
    live,
    metering,
    transcript,
    reply,
    error,
    previewing,
    busy: phase !== "idle",
    recording: phase === "recording",
    clearError: () => setError(null),
    toggleMic,
    startLive,
    startListening,
    stopListening,
    cancelSession,
    speakText,
    previewVoice,
    interruptSpeech,
  };
}
