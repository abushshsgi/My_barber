from django.test import SimpleTestCase

from ai.chat_language import detect_chat_language, resolve_chat_language
from ai.chat_prompts import _format_context_block, build_morf_chat_system_prompt
from ai.services.gemini_chat import build_chat_contents, sanitize_chat_history


class ChatPromptTests(SimpleTestCase):
    def test_context_uses_readable_labels(self):
        block = _format_context_block(
            {
                "face_shape": "oval",
                "hair_type": "short",
                "beard": "light",
                "detected_gender": "male",
                "preferred_style_title": "Crew cut",
            }
        )
        self.assertIn("oval", block)
        self.assertIn("qisqa", block)
        self.assertIn("yengil soqol", block)
        self.assertIn("Crew cut", block)
        self.assertIn("aralashtirma", block)

    def test_empty_context_asks_for_tryon(self):
        block = _format_context_block(None)
        self.assertIn("try-on", block.lower())

    def test_system_prompt_asks_for_markdown(self):
        prompt = build_morf_chat_system_prompt({"face_shape": "round"})
        self.assertIn("markdown", prompt.lower())
        self.assertIn("dumaloq", prompt)
        self.assertIn("jadval", prompt.lower())
        self.assertIn("xotirasi", prompt.lower())

    def test_sanitize_keeps_last_turns(self):
        rows = [{"role": "user", "content": f"m{i}"} for i in range(40)]
        cleaned = sanitize_chat_history(rows)
        self.assertEqual(len(cleaned), 32)
        self.assertEqual(cleaned[0]["content"], "m8")

    def test_build_contents_drops_duplicate_user_message(self):
        history = sanitize_chat_history(
            [
                {"role": "user", "content": "salom"},
                {"role": "assistant", "content": "aleykum"},
                {"role": "user", "content": "fade qilaylik"},
            ]
        )
        contents = build_chat_contents("fade qilaylik", history)
        roles = [c["role"] for c in contents]
        texts = [c["parts"][0]["text"] for c in contents]
        self.assertEqual(roles, ["user", "model", "user"])
        self.assertEqual(texts[-1], "fade qilaylik")
        self.assertEqual(texts.count("fade qilaylik"), 1)

    def test_build_contents_merges_consecutive_same_role(self):
        history = sanitize_chat_history(
            [
                {"role": "user", "content": "a"},
                {"role": "user", "content": "b"},
                {"role": "assistant", "content": "c"},
            ]
        )
        contents = build_chat_contents("d", history)
        self.assertEqual([c["role"] for c in contents], ["user", "model", "user"])
    def test_extract_delta_text(self):
        from ai.services.gemini_chat import extract_delta_text

        payload = {
            "candidates": [
                {"content": {"parts": [{"text": "Salom "}, {"text": "dunyo"}]}}
            ]
        }
        self.assertEqual(extract_delta_text(payload), "Salom dunyo")

    def test_parse_sse_payloads(self):
        from ai.services.gemini_chat import parse_sse_payloads

        raw = (
            'data: {"candidates":[{"content":{"parts":[{"text":"A"}]}}]}\n\n'
            "data: [DONE]\n\n"
            'data: {"candidates":[{"content":{"parts":[{"text":"B"}]}}]}\n\n'
        )
        payloads = parse_sse_payloads(raw)
        self.assertEqual(len(payloads), 2)
        from ai.services.gemini_chat import extract_delta_text

        self.assertEqual("".join(extract_delta_text(p) for p in payloads), "AB")


class ChatLanguageTests(SimpleTestCase):
    def test_uzbek_latin(self):
        lang = detect_chat_language("Yuz shaklimga qaysi soch uslublari mos keladi?")
        self.assertEqual(lang.code, "uz-latn")
        self.assertTrue(lang.confident)

    def test_uzbek_latin_with_apostrophe(self):
        lang = detect_chat_language("O'zbekcha qisqa maslahat bering")
        self.assertEqual(lang.code, "uz-latn")

    def test_uzbek_cyrillic(self):
        lang = detect_chat_language("Менга соч учун маслаҳат беринг")
        self.assertEqual(lang.code, "uz-cyrl")
        self.assertTrue(lang.confident)

    def test_russian(self):
        lang = detect_chat_language("Мне нужна короткая стрижка")
        self.assertEqual(lang.code, "ru")
        self.assertTrue(lang.confident)

    def test_english_is_other(self):
        lang = detect_chat_language("What haircut suits a round face?")
        self.assertEqual(lang.code, "other")
        self.assertEqual(lang.label, "ingliz")
        self.assertTrue(lang.confident)

    def test_mixed_uzbek_sentence_stays_latin(self):
        lang = detect_chat_language("Salom, menga sobsheniye kelmadi")
        self.assertEqual(lang.code, "uz-latn")

    def test_english_wrapper_around_uzbek_thought(self):
        lang = detect_chat_language("Hello, menga fade kerak")
        self.assertEqual(lang.code, "uz-latn")

    def test_uzbek_greeting_with_english_question(self):
        lang = detect_chat_language("Salom, how are you?")
        self.assertEqual(lang.code, "other")
        self.assertEqual(lang.label, "ingliz")

    def test_other_latin_language(self):
        lang = detect_chat_language("Merhaba, saç modeli önerir misin")
        self.assertEqual(lang.code, "other")
        self.assertNotEqual(lang.label, "ingliz")

    def test_short_followup_uses_previous_user_language(self):
        lang = resolve_chat_language(
            "fade",
            history=[
                {"role": "user", "content": "Мне нужна стрижка"},
                {"role": "assistant", "content": "Короткая или подлиннее?"},
            ],
        )
        self.assertEqual(lang.code, "ru")

    def test_prompt_follows_last_message_not_settings(self):
        prompt = build_morf_chat_system_prompt(
            {"reply_lang": "ru", "face_shape": "round"},
            user_message="What haircut suits a round face?",
        )
        self.assertIn("ingliz", prompt.lower())
        self.assertNotIn("savol tilidan qat'i nazar", prompt)
        self.assertIn("eng oxirgi", prompt.lower())
        self.assertIn("dumaloq", prompt)

    def test_prompt_uzbek_cyrillic_directive(self):
        prompt = build_morf_chat_system_prompt(
            {"reply_lang": "uz"},
            user_message="Менга соч учун маслаҳат беринг",
        )
        self.assertIn("o'zbek (kirill)", prompt)
        self.assertNotIn("savol tilidan qat'i nazar", prompt)
