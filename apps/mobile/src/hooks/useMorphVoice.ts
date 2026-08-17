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

export type MorphVoicePhase =
  | "idle"
  | "recording"
  | "transcribing"
  | "thinking"
  | "speaking";

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
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const liveRef = useRef(false);
  const phaseRef = useRef<MorphVoicePhase>("idle");
  const cancelledRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
  }, []);

  const unloadSound = useCallback(async () => {
    const sound = soundRef.current;
    soundRef.current = null;
    if (!sound) return;
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
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const stopRecordingInternal = useCallback(async (): Promise<string | null> => {
    stopPoll();
    const rec = recordingRef.current;
    recordingRef.current = null;
    if (!rec) return null;
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
    return rec.getURI();
  }, [stopPoll]);

  const cancelSession = useCallback(async () => {
    cancelledRef.current = true;
    liveRef.current = false;
    setLive(false);
    setError(null);
    await stopRecordingInternal();
    await unloadSound();
    setPhaseSafe("idle");
    setMetering(-160);
  }, [setPhaseSafe, stopRecordingInternal, unloadSound]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopPoll();
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

  const playServerAudio = useCallback(async (base64: string, mime: string) => {
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
  }, [unloadSound]);

  const speakText = useCallback(
    async (text: string) => {
      const spoken = sanitizeSpeechText(text);
      if (!spoken || cancelledRef.current) return;
      const prefs = prefsRef.current ?? (await loadPrefs());
      setPhaseSafe("speaking");
      await unloadSound();
      try {
        const res = await speakMorphVoice({
          text: spoken,
          voiceId: prefs.voiceId,
          gender: prefs.voiceGender,
          lang: prefs.voiceLang,
        });
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
          setPhaseSafe("idle");
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

  const finishTurn = useCallback(
    async (uri: string | null) => {
      if (!uri || cancelledRef.current) {
        setPhaseSafe("idle");
        return;
      }
      const prefs = prefsRef.current ?? (await loadPrefs());
      setPhaseSafe("transcribing");
      try {
        const uriLower = uri.toLowerCase();
        const guessed = uriLower.endsWith(".webm")
          ? { extension: "webm", mime: "audio/webm" }
          : uriLower.endsWith(".3gp")
            ? { extension: "3gp", mime: "audio/3gpp" }
            : recordingMime();
        const result = await transcribeMorphVoice({
          uri,
          name: `speech.${guessed.extension}`,
          mime: guessed.mime,
          lang: prefs.voiceLang,
        });
        if (cancelledRef.current) return;
        const text = result.text.trim();
        if (!text) {
          setError("Ovoz aniqlanmadi. Qayta gapiring.");
          setPhaseSafe("idle");
          return;
        }
        setTranscript(text);
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
          setPhaseSafe("idle");
          return;
        }
        if (prefs.autoSpeak) {
          await speakText(lastReply());
        } else {
          setPhaseSafe("idle");
        }
        if (liveRef.current && !cancelledRef.current && prefs.conversationMode) {
          setTimeout(() => {
            if (liveRef.current && !cancelledRef.current) {
              void startListeningRef.current();
            }
          }, 380);
        }
      } catch (err) {
        if (err instanceof MorphPlanLimitError) {
          onLimit();
        } else {
          setError(err instanceof Error ? err.message : "Ovoz ishlamadi");
        }
        setPhaseSafe("idle");
      }
    },
    [lastReply, loadPrefs, onLimit, onOpenChat, sendText, setPhaseSafe, speakText],
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
    heardRef.current = false;
    silentRef.current = 0;
    startedAtRef.current = Date.now();
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
          if (typeof status.metering === "number") setMetering(status.metering);
          if (elapsed >= 45_000 || next.stop) {
            const uri = await stopRecordingInternal();
            await finishTurn(uri);
          }
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 120);
  }, [
    finishTurn,
    loadPrefs,
    requireAccess,
    setPhaseSafe,
    stopPoll,
    stopRecordingInternal,
    unloadSound,
  ]);
  startListeningRef.current = startListening;

  const stopListening = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    const uri = await stopRecordingInternal();
    await finishTurn(uri);
  }, [finishTurn, stopRecordingInternal]);

  const toggleMic = useCallback(async () => {
    if (phaseRef.current === "recording") {
      await stopListening();
      return;
    }
    if (phaseRef.current !== "idle") {
      await cancelSession();
      return;
    }
    const prefs = await loadPrefs();
    if (prefs.conversationMode) {
      cancelledRef.current = false;
      liveRef.current = true;
      setLive(true);
    }
    await startListening();
  }, [cancelSession, loadPrefs, startListening, stopListening]);

  const startLive = useCallback(async () => {
    cancelledRef.current = false;
    liveRef.current = true;
    setLive(true);
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
