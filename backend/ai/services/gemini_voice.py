"""Morf AI ovoz — Gemini STT + TTS (ChatGPT / Gemini Live tuzilmasi)."""

from __future__ import annotations

import base64
import io
import json
import logging
import re
import time
import urllib.error
import urllib.request
import wave
from typing import Any

from django.conf import settings

from ai.services.errors import AiStyleError, map_gemini_http_error, read_http_error_body
from ai.services.gemini_style import _vision_model
from ai.services.vertex_auth import vertex_configured
from ai.services.vertex_client import generate_content
from ai.usage_pricing import finalize_usage

logger = logging.getLogger(__name__)

ALLOWED_AUDIO_MIME = frozenset(
    {
        "audio/mp4",
        "audio/m4a",
        "audio/x-m4a",
        "audio/aac",
        "audio/mpeg",
        "audio/mp3",
        "audio/wav",
        "audio/x-wav",
        "audio/webm",
        "audio/ogg",
        "audio/flac",
        "audio/3gpp",
        "audio/amr",
        "audio/l16",
        "audio/pcm",
    }
)
MAX_AUDIO_BYTES = 8 * 1024 * 1024
TTS_MAX_CHARS = 2500

DEFAULT_MALE_VOICE = "charon"
DEFAULT_FEMALE_VOICE = "kore"

# Gemini 2.5 TTS prebuilt voices — assistant uchun eng tabiiy juftlik.
MORPH_VOICES: tuple[dict[str, str], ...] = (
    {
        "id": "charon",
        "name": "Charon",
        "gender": "male",
        "style": "informative",
        "gemini_name": "Charon",
    },
    {
        "id": "orus",
        "name": "Orus",
        "gender": "male",
        "style": "firm",
        "gemini_name": "Orus",
    },
    {
        "id": "kore",
        "name": "Kore",
        "gender": "female",
        "style": "firm",
        "gemini_name": "Kore",
    },
    {
        "id": "aoede",
        "name": "Aoede",
        "gender": "female",
        "style": "breezy",
        "gemini_name": "Aoede",
    },
)

_VOICE_BY_ID = {row["id"]: row for row in MORPH_VOICES}

_MD_FENCE = re.compile(r"```[\s\S]*?```")
_MD_INLINE = re.compile(r"`([^`]+)`")
_MD_HEADING = re.compile(r"^\s{0,3}#{1,6}\s+", re.M)
_MD_BOLD = re.compile(r"\*\*([^*]+)\*\*|__([^_]+)__")
_MD_ITALIC = re.compile(r"(?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_)")
_MD_LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")
_MD_LIST = re.compile(r"^\s*[-*+]\s+", re.M)
_MD_NUM = re.compile(r"^\s*\d+\.\s+", re.M)
_WS = re.compile(r"[ \t]+\n")
_MULTI_NL = re.compile(r"\n{3,}")
_CYRILLIC = re.compile(r"[А-Яа-яЁё]")
_UZ_MARK = re.compile(
    r"o['ʻ’`]|g['ʻ’`]|\b(va|yoki|uchun|qanday|soch|soqol|barber|meni|menga)\b",
    re.I,
)


def list_morph_voices() -> dict[str, Any]:
    return {
        "voices": [dict(row) for row in MORPH_VOICES],
        "defaults": {"male": DEFAULT_MALE_VOICE, "female": DEFAULT_FEMALE_VOICE},
    }


def resolve_voice(*, voice_id: str | None = None, gender: str | None = None) -> dict[str, str]:
    raw_id = (voice_id or "").strip().lower()
    if raw_id in _VOICE_BY_ID:
        return dict(_VOICE_BY_ID[raw_id])
    g = (gender or "").strip().lower()
    if g == "female":
        return dict(_VOICE_BY_ID[DEFAULT_FEMALE_VOICE])
    return dict(_VOICE_BY_ID[DEFAULT_MALE_VOICE])


def sanitize_for_speech(text: str, *, max_chars: int = TTS_MAX_CHARS) -> str:
    """Markdown va belgilarni olib tashlab, o'qiladigan nutq matniga aylantiradi."""
    raw = (text or "").replace("\r\n", "\n").strip()
    if not raw:
        return ""
    raw = _MD_FENCE.sub(" ", raw)
    raw = _MD_LINK.sub(r"\1", raw)
    raw = _MD_INLINE.sub(r"\1", raw)
    raw = _MD_HEADING.sub("", raw)
    raw = _MD_BOLD.sub(lambda m: m.group(1) or m.group(2) or "", raw)
    raw = _MD_ITALIC.sub(lambda m: m.group(1) or m.group(2) or "", raw)
    raw = _MD_LIST.sub("", raw)
    raw = _MD_NUM.sub("", raw)
    raw = raw.replace("**", "").replace("__", "")
    raw = _WS.sub("\n", raw)
    raw = _MULTI_NL.sub("\n\n", raw)
    raw = re.sub(r"[ \t]{2,}", " ", raw)
    cleaned = raw.strip()
    if len(cleaned) <= max_chars:
        return cleaned
    cut = cleaned[:max_chars]
    sentence_end = max(cut.rfind("."), cut.rfind("!"), cut.rfind("?"), cut.rfind("\n"))
    if sentence_end >= max_chars // 2:
        return cut[: sentence_end + 1].strip()
    return cut.rsplit(" ", 1)[0].strip()


def detect_transcript_lang(text: str) -> str:
    sample = (text or "").strip()
    if not sample:
        return "uz"
    if _CYRILLIC.search(sample):
        return "ru"
    if _UZ_MARK.search(sample):
        return "uz"
    return "uz"


def normalize_audio_mime(mime: str | None) -> str:
    raw = (mime or "").split(";")[0].strip().lower()
    aliases = {
        "audio/x-m4a": "audio/mp4",
        "audio/m4a": "audio/mp4",
        "audio/mp3": "audio/mpeg",
        "audio/x-wav": "audio/wav",
        "audio/wave": "audio/wav",
    }
    mapped = aliases.get(raw, raw)
    if mapped not in ALLOWED_AUDIO_MIME:
        raise AiStyleError(
            "Ovoz formati qo'llab-quvvatlanmaydi. M4A, AAC, WAV yoki WebM yuboring.",
            400,
        )
    if mapped in {"audio/m4a", "audio/x-m4a"}:
        return "audio/mp4"
    if mapped == "audio/mp3":
        return "audio/mpeg"
    return mapped


def pcm_to_wav(pcm: bytes, *, sample_rate: int = 24000, channels: int = 1, sample_width: int = 2) -> bytes:
    rate = sample_rate if sample_rate > 0 else 24000
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(max(1, channels))
        wf.setsampwidth(max(1, sample_width))
        wf.setframerate(rate)
        wf.writeframes(pcm)
    return buf.getvalue()


def parse_pcm_rate(mime: str | None) -> int:
    raw = (mime or "").lower()
    match = re.search(r"rate=(\d+)", raw)
    if match:
        try:
            return max(8000, min(48000, int(match.group(1))))
        except ValueError:
            return 24000
    return 24000


def _tts_model() -> str:
    configured = (getattr(settings, "GEMINI_TTS_MODEL", None) or "").strip()
    return configured or "gemini-2.5-flash-preview-tts"


def _studio_api_key() -> str:
    return (getattr(settings, "GEMINI_API_KEY", None) or "").strip()


def _post_gemini(model: str, api_key: str, body: dict[str, Any], *, timeout: int = 60) -> dict[str, Any]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def _generate(model: str, body: dict[str, Any], *, timeout: int = 60) -> tuple[dict[str, Any], str, str]:
    """Vertex, keyin AI Studio. (payload, provider, model)."""
    last_error: AiStyleError | None = None
    if vertex_configured():
        try:
            payload = generate_content(model, body, timeout=timeout, kind="general")
            return payload, "vertex", model
        except AiStyleError as exc:
            last_error = exc
            logger.warning("Vertex voice error (%s): %s", model, exc.message)
    api_key = _studio_api_key()
    if api_key:
        try:
            payload = _post_gemini(model, api_key, body, timeout=timeout)
            return payload, "studio", model
        except urllib.error.HTTPError as exc:
            err_body = read_http_error_body(exc)
            logger.warning("Gemini voice HTTP %s (%s): %s", exc.code, model, err_body[:800])
            message_err = map_gemini_http_error(exc.code, err_body)
            raise AiStyleError(message_err, 502 if exc.code >= 500 else 400) from exc
        except urllib.error.URLError as exc:
            logger.warning("Gemini voice network error (%s): %s", model, exc)
            raise AiStyleError("AI serveriga ulanib bo'lmadi.", 502) from exc
        except TimeoutError as exc:
            raise AiStyleError("AI javob juda uzoq davom etdi. Qayta urinib ko'ring.", 504) from exc
    if last_error:
        raise last_error
    raise AiStyleError(
        "AI xizmati hozircha ulanmagan. "
        "VERTEX_SERVICE_ACCOUNT_JSON yoki GEMINI_API_KEY kerak.",
        503,
    )


def _part_dict(part: Any) -> dict[str, Any]:
    return part if isinstance(part, dict) else {}


def _inline_blob(part: dict[str, Any]) -> tuple[str, str] | None:
    blob = part.get("inlineData") or part.get("inline_data") or {}
    if not isinstance(blob, dict):
        return None
    data = blob.get("data") or ""
    mime = str(blob.get("mimeType") or blob.get("mime_type") or "")
    if not data:
        return None
    return str(data), mime


def extract_reply_text(payload: dict[str, Any]) -> str:
    texts: list[str] = []
    for cand in payload.get("candidates") or []:
        if not isinstance(cand, dict):
            continue
        parts = (cand.get("content") or {}).get("parts") or []
        for part in parts:
            item = _part_dict(part)
            if item.get("text"):
                texts.append(str(item["text"]))
    return "\n".join(texts).strip()


def extract_inline_audio(payload: dict[str, Any]) -> tuple[bytes, str]:
    for cand in payload.get("candidates") or []:
        if not isinstance(cand, dict):
            continue
        parts = (cand.get("content") or {}).get("parts") or []
        for part in parts:
            blob = _inline_blob(_part_dict(part))
            if not blob:
                continue
            raw_b64, mime = blob
            try:
                audio = base64.b64decode(raw_b64)
            except Exception as exc:
                raise AiStyleError("Ovoz javobi o'qilmadi.", 502) from exc
            if audio:
                return audio, mime
    raise AiStyleError("AI ovoz qaytarmadi.", 502)


def audio_to_wav_base64(audio: bytes, mime: str | None) -> tuple[str, str]:
    lowered = (mime or "").lower()
    if "wav" in lowered:
        return base64.b64encode(audio).decode("ascii"), "audio/wav"
    if any(tag in lowered for tag in ("mpeg", "mp3", "mp4", "aac", "m4a")):
        out_mime = "audio/mpeg" if "mpeg" in lowered or "mp3" in lowered else "audio/mp4"
        return base64.b64encode(audio).decode("ascii"), out_mime
    wav = pcm_to_wav(audio, sample_rate=parse_pcm_rate(mime))
    return base64.b64encode(wav).decode("ascii"), "audio/wav"


def transcribe_audio(
    *,
    audio_bytes: bytes,
    mime_type: str,
    lang: str | None = None,
) -> dict[str, Any]:
    if not audio_bytes:
        raise AiStyleError("Ovoz fayli bo'sh.", 400)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise AiStyleError("Ovoz juda uzun. Qisqaroq gapiring (1 daqiqagacha).", 400)
    mime = normalize_audio_mime(mime_type)
    hint = (lang or "auto").strip().lower()
    if hint == "ru":
        lang_line = "The speech is Russian. Transcribe in Russian."
    elif hint == "uz":
        lang_line = "The speech is Uzbek (Latin script). Transcribe in Uzbek Latin."
    else:
        lang_line = (
            "The speech may be Uzbek (Latin), Russian, or English. "
            "Transcribe in the spoken language. Uzbek must stay Latin script."
        )

    body: dict[str, Any] = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": mime,
                            "data": base64.b64encode(audio_bytes).decode("ascii"),
                        }
                    },
                    {
                        "text": (
                            "Transcribe the spoken words exactly.\n"
                            f"{lang_line}\n"
                            "Return only the transcript. No quotes, labels, or commentary.\n"
                            "If the audio is silent or unintelligible, return EMPTY."
                        )
                    },
                ],
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
        },
    }

    model = _vision_model()
    started = time.perf_counter()
    payload, provider, used_model = _generate(model, body, timeout=60)
    text = extract_reply_text(payload).strip().strip('"').strip("'")
    if not text or text.upper() == "EMPTY" or text.lower() in {"(empty)", "[empty]"}:
        raise AiStyleError("Ovoz aniqlanmadi. Qayta gapiring.", 400)
    transcript = text[:2000]
    latency_ms = int((time.perf_counter() - started) * 1000)
    usage_nums = finalize_usage(payload, kind="analyze")
    detected = detect_transcript_lang(transcript) if hint in ("", "auto") else hint
    return {
        "text": transcript,
        "lang": detected if detected in ("uz", "ru", "en") else "uz",
        "usage": {
            "prompt": transcript[:500],
            "model": used_model,
            "provider": provider,
            "latency_ms": latency_ms,
            "prompt_tokens": usage_nums["prompt_tokens"],
            "candidates_tokens": usage_nums["candidates_tokens"],
            "thoughts_tokens": usage_nums["thoughts_tokens"],
            "total_tokens": usage_nums["total_tokens"],
            "cost_usd": usage_nums["cost_usd"],
            "tokens_estimated": usage_nums["tokens_estimated"],
        },
    }


def synthesize_speech(
    *,
    text: str,
    voice_id: str | None = None,
    gender: str | None = None,
    lang: str | None = None,
) -> dict[str, Any]:
    spoken = sanitize_for_speech(text)
    if not spoken:
        raise AiStyleError("O'qiladigan matn yo'q.", 400)
    voice = resolve_voice(voice_id=voice_id, gender=gender)
    lang_hint = (lang or "").strip().lower()
    prefix = ""
    if lang_hint == "ru":
        prefix = "Speak in natural Russian: "
    elif lang_hint == "uz":
        prefix = "Speak in natural Uzbek (Latin pronunciation): "

    body: dict[str, Any] = {
        "contents": [{"role": "user", "parts": [{"text": f"{prefix}{spoken}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice["gemini_name"]}
                }
            },
        },
    }

    model = _tts_model()
    started = time.perf_counter()
    try:
        payload, provider, used_model = _generate(model, body, timeout=60)
    except AiStyleError:
        # Vertex ba'zan preview TTS modelini topmaydi — Studio kalit bilan qayta.
        if vertex_configured() and _studio_api_key():
            try:
                payload = _post_gemini(model, _studio_api_key(), body, timeout=60)
                provider, used_model = "studio", model
            except Exception as exc:
                logger.warning("Studio TTS fallback failed: %s", exc)
                raise
        else:
            raise

    audio, mime = extract_inline_audio(payload)
    audio_b64, out_mime = audio_to_wav_base64(audio, mime)
    latency_ms = int((time.perf_counter() - started) * 1000)
    usage_nums = finalize_usage(payload, kind="analyze")
    return {
        "audio_base64": audio_b64,
        "mime": out_mime,
        "voice_id": voice["id"],
        "voice_name": voice["name"],
        "gender": voice["gender"],
        "text": spoken,
        "usage": {
            "prompt": spoken[:500],
            "model": used_model,
            "provider": provider,
            "latency_ms": latency_ms,
            "prompt_tokens": usage_nums["prompt_tokens"],
            "candidates_tokens": usage_nums["candidates_tokens"],
            "thoughts_tokens": usage_nums["thoughts_tokens"],
            "total_tokens": usage_nums["total_tokens"],
            "cost_usd": usage_nums["cost_usd"],
            "tokens_estimated": usage_nums["tokens_estimated"],
        },
    }
