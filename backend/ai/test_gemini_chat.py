from django.test import SimpleTestCase

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
        self.assertIn("Markdown", prompt)
        self.assertIn("dumaloq", prompt)


class ChatHistoryTests(SimpleTestCase):
    def test_sanitize_keeps_last_turns(self):
        rows = [{"role": "user", "content": f"m{i}"} for i in range(20)]
        cleaned = sanitize_chat_history(rows)
        self.assertEqual(len(cleaned), 16)
        self.assertEqual(cleaned[0]["content"], "m4")

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
        self.assertEqual(contents[0]["parts"][0]["text"], "a\nb")
