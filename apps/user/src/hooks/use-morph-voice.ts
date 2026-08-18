import { useCallback, useEffect, useRef, useState } from "react";
import { speakMorphVoice, transcribeMorphVoice } from "@/lib/api/ai";
import { isMorphPlanLimitError } from "@/lib/morph-plan-limit";
import {
  createWebRecorder,
  playBase64Audio,
  sanitizeSpeechText,
  shouldAutoStopListening,
  type MorphVoicePhase,
} from "@/lib/morph-voice";

type Args = {
  onTurn: (text: string) => Promise<string | null>;
  onLimit?: () => void;
  lang?: "auto" | "uz" | "ru";
};

const MIN_RECORD_MS = 520;
const NEXT_TURN_MS = 420;

export function useMorphVoiceChat({ onTurn, onLimit, lang = "auto" }: Args) {
  const [phase, setPhase] = useState<MorphVoicePhase>("idle");
  const [live, setLive] = useState(false);
  const [metering, setMetering] = useState(-160);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<ReturnType<typeof createWebRecorder> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveRef = useRef(false);
  const phaseRef = useRef<MorphVoicePhase>("idle");
  const cancelledRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meteringRef = useRef(-160);
  const heardRef = useRef(false);
  const silentRef = useRef(0);
  const startedAtRef = useRef(0);
  const startRef = useRef<() => Promise<void>>(async () => undefined);
  const onTurnRef = useRef(onTurn);
  onTurnRef.current = onTurn;
  const onLimitRef = useRef(onLimit);
  onLimitRef.current = onLimit;

  const setPhaseSafe = useCallback((next: MorphVoicePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (nextRef.current) clearTimeout(nextRef.current);
    nextRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (!audio) return;
    try {
      audio.pause();
      audio.src = "";
    } catch {
      /* ignore */
    }
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* ignore */
    }
  }, []);

  const stopRec = useCallback(async () => {
    stopTimers();
    const rec = recRef.current;
    recRef.current = null;
    meteringRef.current = -160;
    setMetering(-160);
    if (!rec) return null;
    return rec.stop();
  }, [stopTimers]);

  const cancelSession = useCallback(async () => {
    cancelledRef.current = true;
    liveRef.current = false;
    setLive(false);
    setError(null);
    recRef.current?.cancel();
    recRef.current = null;
    await stopRec();
    stopAudio();
    setPhaseSafe("idle");
  }, [setPhaseSafe, stopAudio, stopRec]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      recRef.current?.cancel();
      stopTimers();
      stopAudio();
    };
  }, [stopAudio, stopTimers]);

  const speakDevice = useCallback(
    async (text: string) => {
      if (!window.speechSynthesis) return;
      await new Promise<void>((resolve) => {
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = lang === "ru" ? "ru-RU" : "uz-UZ";
        utter.rate = 0.96;
        utter.onend = () => resolve();
        utter.onerror = () => resolve();
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      });
    },
    [lang],
  );

  const speakText = useCallback(
    async (text: string) => {
      const spoken = sanitizeSpeechText(text);
      if (!spoken || cancelledRef.current) return;
      setReply(spoken);
      setPhaseSafe("speaking");
      stopAudio();
      try {
        let res;
        try {
          res = await speakMorphVoice({ text: spoken, lang });
        } catch (err) {
          if (isMorphPlanLimitError(err)) throw err;
          res = await speakMorphVoice({ text: spoken, lang });
        }
        if (cancelledRef.current) return;
        const { audio, done } = playBase64Audio(res.audioBase64, res.mime);
        audioRef.current = audio;
        await audio.play();
        await done;
      } catch (err) {
        if (isMorphPlanLimitError(err)) {
          onLimitRef.current?.();
          liveRef.current = false;
          setLive(false);
          setPhaseSafe("idle");
          return;
        }
        if (cancelledRef.current) return;
        await speakDevice(spoken);
      } finally {
        if (!cancelledRef.current && phaseRef.current === "speaking") {
          setPhaseSafe(liveRef.current ? "waiting" : "idle");
        }
      }
    },
    [lang, setPhaseSafe, speakDevice, stopAudio],
  );

  const scheduleNext = useCallback(() => {
    if (!liveRef.current || cancelledRef.current) {
      if (!cancelledRef.current) setPhaseSafe("idle");
      return;
    }
    setPhaseSafe("waiting");
    nextRef.current = setTimeout(() => {
      nextRef.current = null;
      if (liveRef.current && !cancelledRef.current) void startRef.current();
    }, NEXT_TURN_MS);
  }, [setPhaseSafe]);

  const finishTurn = useCallback(
    async (blob: Blob | null) => {
      if (!blob || cancelledRef.current) {
        if (liveRef.current && !cancelledRef.current) scheduleNext();
        else setPhaseSafe("idle");
        return;
      }
      if (Date.now() - startedAtRef.current < MIN_RECORD_MS) {
        setError("Yana bir oz gapiring.");
        if (liveRef.current) scheduleNext();
        else setPhaseSafe("idle");
        return;
      }
      setPhaseSafe("transcribing");
      try {
        const result = await transcribeMorphVoice({ blob, lang });
        if (cancelledRef.current) return;
        const text = result.text.trim();
        if (!text) {
          setError("Ovoz aniqlanmadi. Qayta gapiring.");
          if (liveRef.current) scheduleNext();
          else setPhaseSafe("idle");
          return;
        }
        setTranscript(text);
        setError(null);
        setPhaseSafe("thinking");
        const answer = await onTurnRef.current(text);
        if (cancelledRef.current) return;
        if (!answer) {
          if (liveRef.current) scheduleNext();
          else setPhaseSafe("idle");
          return;
        }
        setReply(answer);
        await speakText(answer);
        if (liveRef.current && !cancelledRef.current) scheduleNext();
      } catch (err) {
        if (isMorphPlanLimitError(err)) {
          liveRef.current = false;
          setLive(false);
          setPhaseSafe("idle");
          onLimitRef.current?.();
          return;
        }
        setError(err instanceof Error ? err.message : "Ovoz ishlamadi");
        if (liveRef.current) scheduleNext();
        else setPhaseSafe("idle");
      }
    },
    [lang, scheduleNext, setPhaseSafe, speakText],
  );

  const startListening = useCallback(async () => {
    if (phaseRef.current === "recording") return;
    cancelledRef.current = false;
    setError(null);
    stopAudio();
    heardRef.current = false;
    silentRef.current = 0;
    startedAtRef.current = Date.now();
    meteringRef.current = -160;
    setMetering(-160);
    const rec = createWebRecorder((db) => {
      meteringRef.current = db;
      setMetering(db);
    });
    recRef.current = rec;
    try {
      await rec.start();
    } catch {
      setError("Mikrofon ruxsati berilmagan.");
      recRef.current = null;
      return;
    }
    setPhaseSafe("recording");
    stopTimers();
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
          const blob = await stopRec();
          await finishTurn(blob);
        }
      })();
    }, 120);
  }, [finishTurn, setPhaseSafe, stopAudio, stopRec, stopTimers]);
  startRef.current = startListening;

  const stopListening = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    const blob = await stopRec();
    await finishTurn(blob);
  }, [finishTurn, stopRec]);

  const toggleLive = useCallback(async () => {
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

  const interrupt = useCallback(async () => {
    stopAudio();
    if (liveRef.current) await startListening();
    else setPhaseSafe("idle");
  }, [setPhaseSafe, startListening, stopAudio]);

  return {
    phase,
    live,
    metering,
    transcript,
    reply,
    error,
    recording: phase === "recording",
    open: live || phase !== "idle" || Boolean(error),
    toggleLive,
    startListening,
    stopListening,
    cancelSession,
    interrupt,
  };
}
