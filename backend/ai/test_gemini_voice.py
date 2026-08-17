from django.test import SimpleTestCase

from ai.chat_prompts import _format_prefs_block
from ai.services.gemini_voice import (
    audio_to_wav_base64,
    detect_transcript_lang,
    extract_inline_audio,
    extract_reply_text,
    latin_uz_to_cyrillic,
    list_morph_voices,
    normalize_audio_mime,
    parse_pcm_rate,
    pcm_to_wav,
    prepare_tts_utterance,
    resolve_voice,
    sanitize_for_speech,
)


class VoiceAlgorithmTests(SimpleTestCase):
    def test_sanitize_strips_markdown(self):
        raw = "## Sarlavha\n**Fade** qiling.\n- Guard #2\n- Taper"
        spoken = sanitize_for_speech(raw)
        self.assertNotIn("**", spoken)
        self.assertNotIn("##", spoken)
        self.assertIn("Fade", spoken)
        self.assertIn("Guard #2", spoken)

    def test_sanitize_truncates_at_sentence(self):
        long = ("Salom. " * 400).strip()
        spoken = sanitize_for_speech(long, max_chars=80)
        self.assertLessEqual(len(spoken), 80)
        self.assertTrue(spoken.endswith("."))

    def test_resolve_voice_defaults(self):
        male = resolve_voice(gender="male")
        female = resolve_voice(gender="female")
        self.assertEqual(male["id"], "puck")
        self.assertEqual(male["gender"], "male")
        self.assertEqual(female["id"], "aoede")
        self.assertEqual(female["gender"], "female")
        self.assertEqual(resolve_voice(voice_id="aoede")["id"], "aoede")
        self.assertEqual(resolve_voice(voice_id="charon")["id"], "puck")

    def test_latin_uz_to_cyrillic(self):
        self.assertEqual(latin_uz_to_cyrillic("Salom"), "салом")
        self.assertEqual(latin_uz_to_cyrillic("o'zbek"), "ўзбек")
        self.assertEqual(latin_uz_to_cyrillic("soch"), "соч")
        self.assertEqual(latin_uz_to_cyrillic("qanday"), "қандай")
        self.assertIn("ў", prepare_tts_utterance("O'zbekcha gapiring", "uz"))

    def test_detect_lang(self):
        self.assertEqual(detect_transcript_lang("Мне нужен фейд"), "ru")
        self.assertEqual(detect_transcript_lang("Menga fade kerak, soch qisqa"), "uz")

    def test_pcm_wav_header(self):
        pcm = b"\x00\x00" * 240
        wav = pcm_to_wav(pcm, sample_rate=24000)
        self.assertTrue(wav.startswith(b"RIFF"))
        self.assertIn(b"WAVE", wav[:12])
        self.assertGreater(len(wav), len(pcm))

    def test_parse_pcm_rate(self):
        self.assertEqual(parse_pcm_rate("audio/L16;codec=pcm;rate=24000"), 24000)
        self.assertEqual(parse_pcm_rate("audio/wav"), 24000)

    def test_normalize_mime(self):
        self.assertEqual(normalize_audio_mime("audio/m4a"), "audio/mp4")
        self.assertEqual(normalize_audio_mime("audio/mp3"), "audio/mpeg")

    def test_list_voices_has_male_and_female(self):
        catalog = list_morph_voices()
        genders = {v["gender"] for v in catalog["voices"]}
        self.assertEqual(genders, {"male", "female"})
        self.assertEqual(catalog["defaults"]["male"], "puck")
        self.assertEqual(catalog["defaults"]["female"], "aoede")

    def test_extract_audio_and_text(self):
        import base64

        pcm = b"\x01\x02\x03\x04"
        payload = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "Salom"},
                            {
                                "inlineData": {
                                    "mimeType": "audio/L16;codec=pcm;rate=24000",
                                    "data": base64.b64encode(pcm).decode("ascii"),
                                }
                            },
                        ]
                    }
                }
            ]
        }
        self.assertEqual(extract_reply_text(payload), "Salom")
        audio, mime = extract_inline_audio(payload)
        self.assertEqual(audio, pcm)
        b64, out_mime = audio_to_wav_base64(audio, mime)
        self.assertEqual(out_mime, "audio/wav")
        self.assertTrue(base64.b64decode(b64).startswith(b"RIFF"))

    def test_voice_mode_prompt(self):
        block = _format_prefs_block({"voice_mode": True, "reply_lang": "uz"})
        self.assertIn("Ovozli suhbat", block)
        self.assertIn("o'zbek", block)
        self.assertIn("Adabiy", block)
