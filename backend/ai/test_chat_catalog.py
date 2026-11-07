import io
import json
import urllib.error
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from ai.chat_persist import append_chat_turn, serialize_message
from ai.chat_prompts import build_morf_chat_system_prompt
from ai.models import HairCareProfile, MorphAiChatMessage
from ai.services.chat_catalog import (
    booking_unavailable_reply,
    catalog_image_url,
    execute_chat_tool,
    extract_slots,
    hydrate_selected_ids,
    is_booking_request,
    public_chat_payload,
    requested_style_limit,
    search_catalog,
    strip_booking_cta,
    wants_hairstyle_recommendation,
)
from ai.services.gemini_chat import generate_morf_chat_reply, stream_morf_chat_reply

User = get_user_model()

MEN_ROW = {
    "style_id": "men-chat-crop",
    "slug": "chat-crop",
    "audience": "men",
    "category": "barber",
    "title": "Textured Crop",
    "title_uz": "Teksturali krop",
    "face_shapes": ["oval"],
    "hair_length": "short",
    "image_path": "/hairstyles/men/chat-crop.webp",
    "description_uz": "Qisqa va zamonaviy uslub.",
    "tags": ["crop", "fade", "short"],
}
WOMEN_ROW = {
    "style_id": "women-chat-bob",
    "slug": "chat-bob",
    "audience": "women",
    "category": "beauty",
    "title": "Soft Bob",
    "title_uz": "Yumshoq bob",
    "face_shapes": ["oval"],
    "hair_length": "medium",
    "image_path": "/hairstyles/women/chat-bob.webp",
    "description_uz": "Yelka atrofidagi bob.",
    "tags": ["bob", "medium"],
}
BLANK_ROW = {
    **MEN_ROW,
    "style_id": "men-chat-blank",
    "slug": "chat-blank",
    "image_path": "",
    "title_uz": "Rasmsiz",
    "tags": ["crop"],
}


def _rows(audience: str):
    return [row for row in (MEN_ROW, WOMEN_ROW, BLANK_ROW) if row["audience"] == audience]


def _gemini_payload(text: str) -> dict:
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


@override_settings(BOOKING_ENABLED=False)
class ChatCatalogUnitTests(SimpleTestCase):
    def test_uzbek_recommendation_and_men_catalog(self):
        message = "erkaglar uchun fade tasiya qil"
        self.assertTrue(wants_hairstyle_recommendation(message))
        slots = extract_slots(message)
        self.assertEqual(slots["audience"], "men")
        self.assertIn("fade", slots["style_query"])
        with patch("ai.services.chat_catalog._published_rows", side_effect=_rows):
            found = search_catalog(slots)
        ids = [item["id"] for item in found["styles"]]
        self.assertIn("men-chat-crop", ids)
        self.assertNotIn("women-chat-bob", ids)
        self.assertNotIn("men-chat-blank", ids)

    def test_russian_women_catalog(self):
        message = "Посоветуй женскую стрижку каре"
        self.assertTrue(wants_hairstyle_recommendation(message))
        slots = extract_slots(message)
        self.assertEqual(slots["audience"], "women")
        with patch("ai.services.chat_catalog._published_rows", side_effect=_rows):
            found = search_catalog({**slots, "style_query": "bob"})
        self.assertTrue(all(item["id"].startswith("women-") for item in found["styles"]))

    def test_unknown_preference_asks_without_styles(self):
        message = "Qanday soch turmagi tavsiya qilasiz?"
        self.assertTrue(wants_hairstyle_recommendation(message))
        slots = extract_slots(message, context={"advice_gender": "male"})
        self.assertEqual(slots["audience"], "")
        found = search_catalog(slots)
        self.assertFalse(found["ok"])
        self.assertEqual(found["reason"], "need_audience")
        self.assertEqual(found["styles"], [])

    def test_missing_image_is_not_returned(self):
        with patch("ai.services.chat_catalog._published_rows", side_effect=_rows):
            cards = hydrate_selected_ids(
                ["men-chat-blank", "men-chat-crop"],
                allowed_ids=["men-chat-blank", "men-chat-crop"],
                audience="men",
            )
        self.assertEqual([card["id"] for card in cards], ["men-chat-crop"])
        self.assertTrue(cards[0]["image_url"].startswith("/hairstyles/"))

    def test_unknown_style_id_is_dropped(self):
        with patch("ai.services.chat_catalog._published_rows", side_effect=_rows):
            cards = hydrate_selected_ids(
                ["no-such-style", "women-chat-bob"],
                allowed_ids=["women-chat-bob"],
                audience="women",
            )
        self.assertEqual([card["id"] for card in cards], ["women-chat-bob"])
        self.assertNotIn("image_url", json.dumps(["no-such-style"]))

    def test_history_keeps_audience_for_followup(self):
        slots = extract_slots(
            "yana boshqa",
            history=[
                {"role": "user", "content": "Ayollar uchun bob tavsiya qil"},
                {"role": "assistant", "content": "Mana."},
            ],
        )
        self.assertEqual(slots["audience"], "women")
        self.assertTrue(
            wants_hairstyle_recommendation(
                "yana boshqa",
                history=[{"role": "user", "content": "Ayollar uchun bob tavsiya qil"}],
            )
        )

    def test_booking_question_does_not_offer_a_booking_step(self):
        self.assertTrue(is_booking_request("Barberga yozilmoqchiman"))
        reply = booking_unavailable_reply("Barberga yozilmoqchiman")
        self.assertIn("vaqtincha", reply)
        self.assertNotIn("yoziling", reply.lower())
        self.assertNotIn("Keyingi qadam", reply)
        blocked = execute_chat_tool("create_booking", {}, {"audience": "men"})
        self.assertFalse(blocked["ok"])
        self.assertEqual(blocked["reason"], "booking_disabled")

    def test_booking_cta_is_stripped_from_model_text(self):
        raw = (
            "Teksturali krop qisqa yuzga mos. "
            "Keyingi qadam: Barberingizga yuqoridagi jadvaldan o‘zingizga yoqqan uslubni ko‘rsatib, to‘g‘ridan-to‘g‘ri yozilishingiz mumkin."
        )
        cleaned = strip_booking_cta(raw)
        self.assertIn("Teksturali krop", cleaned)
        self.assertNotIn("yozilishingiz", cleaned)

    def test_prompt_blocks_booking_and_keeps_language_rules(self):
        prompt = build_morf_chat_system_prompt(
            {"face_shape": "round"},
            user_message="What haircut suits a round face?",
        )
        self.assertIn("BOOKING_ENABLED=false", prompt)
        self.assertIn("taklif qilma", prompt.lower())
        self.assertIn("ingliz", prompt.lower())
        self.assertIn("markdown", prompt.lower())
        self.assertIn("jadval", prompt.lower())
        self.assertNotIn("master card", prompt.lower())

    def test_length_filter_keeps_only_matching_catalog_rows(self):
        long_row = {
            **WOMEN_ROW,
            "style_id": "women-chat-layers",
            "slug": "chat-layers",
            "hair_length": "long",
            "title_uz": "Uzun qatlam",
            "description_uz": "Uzun soch qatlamlari.",
            "tags": ["long"],
        }

        def rows(audience: str):
            found = _rows(audience)
            if audience == "women":
                found.append(long_row)
            return found

        message = "Ayollar uchun uzun soch turmaklarini ko‘rsat."
        self.assertTrue(wants_hairstyle_recommendation(message))
        slots = extract_slots(message)
        self.assertEqual(slots["audience"], "women")
        self.assertEqual(slots["hair_length"], "long")
        with patch("ai.services.chat_catalog._published_rows", side_effect=rows):
            found = search_catalog(slots)
        self.assertEqual([item["id"] for item in found["styles"]], ["women-chat-layers"])

    def test_requested_count_and_real_image_urls(self):
        self.assertEqual(
            requested_style_limit("Menga 5 ta qisqa soch turmagini tavsiya qil."),
            5,
        )
        self.assertIsNone(catalog_image_url({**MEN_ROW, "image_path": "https://evil.example/fake.webp"}))
        self.assertEqual(
            catalog_image_url(MEN_ROW),
            "/hairstyles/men/chat-crop.webp",
        )
        self.assertIsNone(
            catalog_image_url(
                {
                    **WOMEN_ROW,
                    "slug": "long-layers",
                    "image_path": "/hairstyles/women/personas/leyla/long-layers.webp",
                }
            )
        )
        self.assertEqual(
            catalog_image_url(
                {
                    **MEN_ROW,
                    "slug": "buzz-cut",
                    "image_path": "/hairstyles/men/personas/irland/buzz-cut.webp",
                }
            ),
            "/hairstyles/men/personas/irland/buzz-cut.webp",
        )
        with (
            patch("media_store.utils.media_name_exists", return_value=True) as exists,
            patch("media_store.utils.media_url", return_value="/media/looks/chat-crop.webp") as stored,
        ):
            url = catalog_image_url({**MEN_ROW, "image_path": "/media/looks/chat-crop.webp"})
        self.assertEqual(url, "/media/looks/chat-crop.webp")
        exists.assert_called_once()
        stored.assert_called_once()

    def test_legacy_payload_keeps_reply(self):
        body = public_chat_payload(
            reply="Salom",
            limits={"daily_limit": 10, "daily_used": 1, "daily_remaining": 9},
            thread_id="t1",
            response_type="text",
            hairstyles=[],
        )
        self.assertEqual(body["reply"], "Salom")
        self.assertNotIn("hairstyles", body)
        rich = public_chat_payload(
            reply="Mana",
            limits={},
            thread_id=None,
            response_type="hairstyle_recommendation",
            hairstyles=[{"id": "men-chat-crop", "name": "Teksturali krop", "image_url": "/hairstyles/men/chat-crop.webp"}],
        )
        self.assertEqual(rich["reply"], rich["message"])
        self.assertEqual(rich["hairstyles"][0]["id"], "men-chat-crop")


@override_settings(BOOKING_ENABLED=False, GEMINI_API_KEY="test-key")
class ChatCatalogGeminiTests(SimpleTestCase):
    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_model_cannot_attach_unknown_id_or_image(self, post, _rows_mock, _vertex):
        post.return_value = _gemini_payload(
            json.dumps(
                {
                    "message": "Sizga shu uslub mos.",
                    "style_ids": ["no-such-style", "men-chat-crop"],
                }
            )
        )
        result = generate_morf_chat_reply(user_message="Erkaklar uchun crop tavsiya qil")
        self.assertEqual(result["type"], "hairstyle_recommendation")
        self.assertEqual([item["id"] for item in result["hairstyles"]], ["men-chat-crop"])
        self.assertNotIn("no-such-style", json.dumps(result["hairstyles"]))
        system_text = post.call_args.args[2]["systemInstruction"]["parts"][0]["text"]
        self.assertNotIn("men-chat-crop", system_text)
        encoded = json.dumps(post.call_args.args[2]["contents"], ensure_ascii=False)
        self.assertIn("men-chat-crop", encoded)
        self.assertNotIn("image_url", encoded)

    @patch("ai.services.gemini_chat.time.sleep")
    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_retries_rate_limit_then_succeeds(self, post, _vertex, _sleep):
        rate = urllib.error.HTTPError(
            "https://example.test",
            429,
            "rate",
            hdrs=None,
            fp=io.BytesIO(b"{}"),
        )
        post.side_effect = [rate, _gemini_payload("Parvarishni haftada 2-3 marta qiling.")]
        result = generate_morf_chat_reply(user_message="Haftalik parvarish tartibini ayt.")
        self.assertIn("Parvarish", result["reply"])
        self.assertEqual(post.call_count, 2)
        _sleep.assert_called()

    @patch("ai.services.gemini_chat.time.sleep")
    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_timeout_is_retried(self, post, _vertex, _sleep):
        post.side_effect = [TimeoutError(), _gemini_payload("Qisqa javob.")]
        result = generate_morf_chat_reply(user_message="Salom, hammomda sochni qanday yuvaman?")
        self.assertEqual(result["reply"], "Qisqa javob.")
        self.assertGreaterEqual(post.call_count, 2)

    @patch("ai.services.gemini_chat._post_gemini")
    def test_booking_question_skips_the_model(self, post):
        result = generate_morf_chat_reply(user_message="Menga salon band qilib ber")
        self.assertIn("vaqtincha", result["reply"])
        self.assertEqual(result["hairstyles"], [])
        post.assert_not_called()

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_plain_text_still_attaches_explore_cards(self, post, _rows_mock, _vertex):
        post.return_value = _gemini_payload(
            "Zamonaviy ko‘rinish uchun qisqa fade yaxshi turadi. "
            "https://fake.example/not-a-catalog.webp "
            "Keyingi qadam: yozilishingiz mumkin."
        )
        result = generate_morf_chat_reply(
            user_message="Menga erkaklar uchun zamonaviy soch turmaklarini rasmlari bilan tavsiya qil.",
        )
        self.assertEqual(result["type"], "hairstyle_recommendation")
        self.assertIn("fade", result["reply"].lower())
        self.assertNotIn("http", result["reply"])
        self.assertNotIn("yozil", result["reply"].lower())
        self.assertEqual(len(result["hairstyles"]), 1)
        card = result["hairstyles"][0]
        self.assertEqual(card["id"], "men-chat-crop")
        self.assertEqual(card["name"], "Teksturali krop")
        self.assertEqual(card["image_url"], "/hairstyles/men/chat-crop.webp")
        self.assertEqual(card["description"], "Qisqa va zamonaviy uslub.")
        self.assertNotIn("no-such-style", json.dumps(result["hairstyles"]))

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_english_picture_request_uses_men_catalog(self, post, _rows_mock, _vertex):
        post.return_value = _gemini_payload("Here are a few men's cuts from the catalog.")
        result = generate_morf_chat_reply(user_message="Show me men's hairstyles with pictures.")
        self.assertEqual(result["type"], "hairstyle_recommendation")
        self.assertTrue(result["reply"])
        self.assertEqual([item["id"] for item in result["hairstyles"]], ["men-chat-crop"])
        self.assertTrue(result["hairstyles"][0]["image_url"].startswith("/hairstyles/men/"))

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_women_long_and_five_short_queries(self, post, _vertex):
        long_row = {
            **WOMEN_ROW,
            "style_id": "women-chat-layers",
            "slug": "chat-layers",
            "hair_length": "long",
            "title_uz": "Uzun qatlam",
            "description_uz": "Uzun soch qatlamlari.",
            "image_path": "/hairstyles/women/chat-layers.webp",
            "tags": ["long"],
        }
        men_short = [
            {
                **MEN_ROW,
                "style_id": f"men-short-{index}",
                "slug": f"short-{index}",
                "hair_length": "short",
                "title_uz": f"Qisqa {index}",
                "description_uz": "Qisqa erkaklar uslubi.",
                "image_path": f"/hairstyles/men/short-{index}.webp",
                "tags": ["short"],
            }
            for index in range(1, 7)
        ]

        def rows(audience: str):
            if audience == "women":
                return [WOMEN_ROW, long_row]
            return men_short

        post.return_value = _gemini_payload("Mana katalogdagi uzun variant.")
        with patch("ai.services.chat_catalog._published_rows", side_effect=rows):
            women = generate_morf_chat_reply(
                user_message="Ayollar uchun uzun soch turmaklarini ko‘rsat.",
            )
        self.assertEqual([item["id"] for item in women["hairstyles"]], ["women-chat-layers"])
        self.assertEqual(women["hairstyles"][0]["image_url"], "/hairstyles/women/chat-layers.webp")

        post.return_value = _gemini_payload("Erkaklar uchunmi yoki ayollar?")
        with patch("ai.services.chat_catalog._published_rows", side_effect=rows):
            unknown = generate_morf_chat_reply(
                user_message="Menga 5 ta qisqa soch turmagini tavsiya qil.",
            )
        self.assertEqual(unknown["hairstyles"], [])
        self.assertIn("?", unknown["reply"])

        post.return_value = _gemini_payload("Mana beshta qisqa uslub.")
        with patch("ai.services.chat_catalog._published_rows", side_effect=rows):
            counted = generate_morf_chat_reply(
                user_message="Menga erkaklar uchun 5 ta qisqa soch turmagini tavsiya qil.",
            )
        self.assertEqual(len(counted["hairstyles"]), 5)
        self.assertTrue(all(item["id"].startswith("men-short-") for item in counted["hairstyles"]))
        self.assertTrue(all(item["hair_length"] == "short" for item in counted["hairstyles"]))
        self.assertTrue(all(item["image_url"].startswith("/hairstyles/men/") for item in counted["hairstyles"]))

    @patch("ai.services.gemini_chat.time.sleep")
    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_json_schema_rejection_still_returns_catalog_cards(self, post, _rows_mock, _vertex, _sleep):
        rejected = urllib.error.HTTPError(
            "https://example.test",
            400,
            "bad schema",
            hdrs=None,
            fp=io.BytesIO(b'{"error":{"message":"schema"}}'),
        )
        post.side_effect = [
            rejected,
            _gemini_payload("Matn sifatida yozaman, id bermayman."),
        ]
        result = generate_morf_chat_reply(user_message="Show me men's hairstyles with pictures.")
        self.assertEqual(result["hairstyles"][0]["id"], "men-chat-crop")
        self.assertGreaterEqual(post.call_count, 2)

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_unpublished_persona_image_does_not_invent_a_card(self, post, _vertex):
        def rows(audience: str):
            if audience != "women":
                return []
            return [
                {
                    **WOMEN_ROW,
                    "style_id": "women-long-layers",
                    "slug": "long-layers",
                    "hair_length": "long",
                    "image_path": "/hairstyles/women/personas/leyla/long-layers.webp",
                }
            ]

        with patch("ai.services.chat_catalog._published_rows", side_effect=rows):
            result = generate_morf_chat_reply(
                user_message="Ayollar uchun uzun soch turmaklarini ko‘rsat.",
            )
        self.assertEqual(result["hairstyles"], [])
        self.assertIn("rasm", result["reply"].lower())
        self.assertNotIn("http", result["reply"])
        post.assert_not_called()

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_stream_done_event_carries_catalog_cards(self, post, _rows_mock, _vertex):
        post.return_value = _gemini_payload("Here are a few cuts.")
        events = list(
            stream_morf_chat_reply(user_message="Show me men's hairstyles with pictures.")
        )
        done = events[-1]
        self.assertTrue(done.get("done"))
        self.assertTrue(done.get("reply"))
        self.assertEqual(done["type"], "hairstyle_recommendation")
        self.assertEqual(done["hairstyles"][0]["id"], "men-chat-crop")
        self.assertIn("image_url", done["hairstyles"][0])
        self.assertTrue(any(event.get("block") for event in events[:-1]))
        self.assertEqual(events[-1]["blocks"][0]["type"], "text")
        self.assertEqual(events[-1]["blocks"][1]["type"], "single_image")

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_model_blocks_place_images_between_text(self, post, _rows_mock, _vertex):
        post.return_value = _gemini_payload(
            json.dumps(
                {
                    "blocks": [
                        {"type": "text", "content": "Sizga shu ikki uslub mos."},
                        {
                            "type": "image_pair",
                            "hairstyle_ids": ["no-such-style", "men-chat-crop"],
                        },
                        {"type": "text", "content": "Krop qisqa va kundalik kiyishga qulay."},
                    ]
                }
            )
        )
        result = generate_morf_chat_reply(user_message="Menga 2 ta erkaklar soch turmagini ko'rsat.")
        self.assertEqual([block["type"] for block in result["blocks"]], ["text", "single_image", "text"])
        self.assertEqual(result["blocks"][1]["items"][0]["id"], "men-chat-crop")
        self.assertEqual(result["blocks"][1]["items"][0]["image_url"], "/hairstyles/men/chat-crop.webp")
        self.assertNotIn("no-such-style", json.dumps(result["blocks"]))
        self.assertNotIn("http", result["reply"])
        self.assertTrue(result["reply"].index("Sizga") < result["reply"].index("Krop"))
        encoded = json.dumps(post.call_args.args[2]["contents"], ensure_ascii=False)
        self.assertNotIn("image_url", encoded)

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_comparison_uses_previous_recommendation_order(self, post, _vertex):
        rows = [
            {
                **MEN_ROW,
                "style_id": f"men-short-{index}",
                "slug": f"short-{index}",
                "hair_length": "short",
                "title_uz": f"Qisqa {index}",
                "description_uz": f"{index}-uslub.",
                "image_path": f"/hairstyles/men/short-{index}.webp",
                "tags": ["short"],
            }
            for index in (1, 2, 3)
        ]

        def published(audience: str):
            return rows if audience == "men" else []

        post.return_value = _gemini_payload("Birinchisi qisqa. Uchinchisi yanada zamonaviy.")
        with patch("ai.services.chat_catalog._published_rows", side_effect=published):
            result = generate_morf_chat_reply(
                user_message="Birinchi va uchinchisini solishtir.",
                history=[
                    {"role": "user", "content": "Erkaklar uchun qisqa soch turmagi tavsiya qil"},
                    {
                        "role": "assistant",
                        "content": "Mana uchta variant.",
                        "hairstyles": [
                            {"id": "men-short-1", "name": "Qisqa 1", "audience": "men"},
                            {"id": "men-short-2", "name": "Qisqa 2", "audience": "men"},
                            {"id": "men-short-3", "name": "Qisqa 3", "audience": "men"},
                        ],
                    },
                ],
            )
        self.assertEqual([item["id"] for item in result["hairstyles"]], ["men-short-1", "men-short-3"])
        image_block = next(block for block in result["blocks"] if block["type"] != "text")
        self.assertEqual(image_block["type"], "comparison")
        self.assertEqual([item["id"] for item in image_block["items"]], ["men-short-1", "men-short-3"])
        self.assertEqual(result["blocks"][0]["type"], "text")
        self.assertEqual(result["blocks"][-1]["type"], "text")
        self.assertNotIn("women-", json.dumps(result["hairstyles"]))

    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_care_question_does_not_attach_images(self, post, _vertex):
        post.return_value = _gemini_payload("Sochni haftada 2-3 marta yumshoq shampun bilan yuving.")
        result = generate_morf_chat_reply(user_message="Sochni qanday parvarish qilish kerak?")
        self.assertEqual(result["hairstyles"], [])
        self.assertEqual(result["blocks"], [])
        self.assertIn("shampun", result["reply"].lower())
        self.assertNotIn("yozil", result["reply"].lower())


@override_settings(BOOKING_ENABLED=False)
class ChatCatalogApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="901000111@phone.mysaloon.local",
            email="901000111@phone.mysaloon.local",
            phone="+998901000111",
            password="unused",
        )
        HairCareProfile.objects.create(
            user=self.user,
            condition="dry",
            texture="straight",
            color_status="natural",
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    @patch("ai.views.check_user_can_generate", return_value=None)
    @patch("ai.services.gemini_chat.generate_morf_chat_reply")
    def test_old_clients_still_read_reply(self, generate, _allowed):
        generate.return_value = {
            "reply": "Mana mos uslub.",
            "type": "hairstyle_recommendation",
            "hairstyles": [
                {
                    "id": "men-chat-crop",
                    "name": "Teksturali krop",
                    "image_url": "/hairstyles/men/chat-crop.webp",
                    "description": "Qisqa.",
                }
            ],
            "usage": {"prompt": "x", "model": "test", "provider": "test", "latency_ms": 1},
        }
        res = self.client.post(
            "/api/v1/ai/chat/",
            {"message": "Erkaklar uchun crop tavsiya qil", "thread_id": "legacy-1", "persist": True},
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertEqual(body["reply"], "Mana mos uslub.")
        self.assertEqual(body["message"], body["reply"])
        self.assertEqual(body["type"], "hairstyle_recommendation")
        self.assertEqual(body["hairstyles"][0]["image_url"], "/hairstyles/men/chat-crop.webp")
        stored = MorphAiChatMessage.objects.get(role="assistant")
        serialized = serialize_message(stored)
        self.assertEqual(serialized["hairstyles"][0]["id"], "men-chat-crop")

    def test_saved_turn_is_scoped_to_the_user_thread(self):
        append_chat_turn(
            user_id=self.user.pk,
            thread_client_id="thread-a",
            user_message="Ayollar uchun bob tavsiya qil",
            assistant_message="Mana.",
            assistant_context={
                "type": "hairstyle_recommendation",
                "hairstyles": [{"id": "women-chat-bob", "name": "Bob", "image_url": "/hairstyles/women/chat-bob.webp"}],
            },
        )
        other = User.objects.create_user(
            username="901000222@phone.mysaloon.local",
            email="901000222@phone.mysaloon.local",
            phone="+998901000222",
            password="unused",
        )
        append_chat_turn(
            user_id=other.pk,
            thread_client_id="thread-a",
            user_message="Boshqa odam",
            assistant_message="Yashirin",
        )
        res = self.client.get("/api/v1/ai/chat/threads/?messages=1")
        self.assertEqual(res.status_code, 200)
        threads = res.json()
        self.assertEqual(len(threads), 1)
        self.assertEqual(threads[0]["messages"][0]["content"], "Ayollar uchun bob tavsiya qil")
        self.assertEqual(threads[0]["messages"][1]["hairstyles"][0]["id"], "women-chat-bob")

    def test_image_only_assistant_turn_stays_in_the_thread(self):
        from ai.chat_persist import upsert_thread_from_client

        append_chat_turn(
            user_id=self.user.pk,
            thread_client_id="photos-1",
            user_message="Rasmlarini ko'rsat",
            assistant_message="",
            assistant_context={
                "type": "hairstyle_recommendation",
                "hairstyles": [
                    {"id": "men-chat-crop", "name": "Teksturali krop", "image_url": "/hairstyles/men/chat-crop.webp"}
                ],
            },
        )
        stored = MorphAiChatMessage.objects.get(role="assistant")
        self.assertEqual(serialize_message(stored)["hairstyles"][0]["image_url"], "/hairstyles/men/chat-crop.webp")

        upsert_thread_from_client(
            user_id=self.user.pk,
            client_id="photos-1",
            messages=[
                {"id": "u1", "role": "user", "content": "Rasmlarini ko'rsat"},
                {
                    "id": "a1",
                    "role": "assistant",
                    "content": "",
                    "hairstyles": [
                        {"id": "men-chat-crop", "name": "Teksturali krop", "image_url": "/hairstyles/men/chat-crop.webp"}
                    ],
                },
            ],
        )
        res = self.client.get("/api/v1/ai/chat/threads/photos-1/")
        self.assertEqual(res.status_code, 200)
        messages = res.json()["messages"]
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[1]["hairstyles"][0]["id"], "men-chat-crop")

    @override_settings(BOOKING_ENABLED=False, GEMINI_API_KEY="test-key")
    @patch("ai.views.check_user_can_generate", return_value=None)
    @patch("ai.services.gemini_chat.vertex_configured", return_value=False)
    @patch("ai.services.chat_catalog._published_rows", side_effect=_rows)
    @patch("ai.services.gemini_chat._post_gemini")
    def test_endpoint_returns_catalog_cards_for_prose_model(self, post, _rows_mock, _vertex, _allowed):
        post.return_value = _gemini_payload("Sizga katalogdagi krop mos keladi.")
        res = self.client.post(
            "/api/v1/ai/chat/",
            {
                "message": "Menga erkaklar uchun zamonaviy soch turmaklarini rasmlari bilan tavsiya qil.",
                "thread_id": "cards-1",
                "persist": True,
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        self.assertTrue(body["reply"])
        self.assertEqual(body["reply"], body["message"])
        self.assertEqual(body["type"], "hairstyle_recommendation")
        card = body["hairstyles"][0]
        self.assertEqual(card["id"], "men-chat-crop")
        self.assertEqual(card["name"], "Teksturali krop")
        self.assertEqual(card["image_url"], "/hairstyles/men/chat-crop.webp")
        self.assertEqual(card["description"], "Qisqa va zamonaviy uslub.")
        stored = MorphAiChatMessage.objects.get(role="assistant")
        self.assertEqual(serialize_message(stored)["hairstyles"][0]["image_url"], card["image_url"])
