from io import BytesIO
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings
from PIL import Image

from ai.services.errors import AiStyleError
from ai.services.girl_models import generate_girl_model, publish_girl_model, set_model_liked


def _jpeg() -> bytes:
    buf = BytesIO()
    Image.new("RGB", (32, 48), (180, 140, 120)).save(buf, format="JPEG")
    return buf.getvalue()


@override_settings(RUNWARE_API_KEY="test-key", RUNWARE_TRYON_MODEL="runware:400@6")
class GirlModelTests(SimpleTestCase):
    def _library(self):
        state = {"items": []}

        def read_json(_name, default=None):
            return {"items": list(state["items"])}

        def write_json(_name, data):
            state["items"] = list(data.get("items") or [])

        return state, read_json, write_json

    def test_generate_uses_runware_text_to_image(self):
        state, read_json, write_json = self._library()
        saved = {}

        def save(rel, data, **_kwargs):
            saved["rel"] = rel
            saved["data"] = data
            return rel

        with (
            patch("ai.services.girl_models.read_json_media", side_effect=read_json),
            patch("ai.services.girl_models.write_json_media", side_effect=write_json),
            patch("ai.services.girl_models.save_media_bytes", side_effect=save),
            patch("ai.services.girl_models.media_name_exists", return_value=True),
            patch(
                "ai.services.girl_models.run_image_inference",
                return_value={"imageURL": "https://im.runware.ai/image/ii/girl.png"},
            ) as infer,
            patch("ai.services.girl_models.download_image", return_value=_jpeg()),
        ):
            item = generate_girl_model(look_id="central-asian", prompt_extra="soft daylight")

        task = infer.call_args.args[0]
        self.assertEqual(task["model"], "runware:400@6")
        self.assertNotIn("inputs", task)
        self.assertNotIn("referenceImages", task)
        self.assertEqual(task["width"], 768)
        self.assertEqual(task["height"], 1024)
        self.assertIn("Central Asian", task["positivePrompt"])
        self.assertIn("soft daylight", task["positivePrompt"])
        self.assertTrue(saved["rel"].startswith("girl_models/central-asian/"))
        self.assertEqual(item["look_id"], "central-asian")
        self.assertFalse(item["liked"])
        self.assertEqual(len(state["items"]), 1)

    def test_missing_key_is_not_configured(self):
        with override_settings(RUNWARE_API_KEY=""):
            with self.assertRaises(AiStyleError) as ctx:
                generate_girl_model(look_id="slavic")
        self.assertEqual(ctx.exception.status, 503)

    def test_like_and_publish_into_women_slot(self):
        state, read_json, write_json = self._library()
        state["items"] = [
            {
                "id": "abc123",
                "look_id": "slavic",
                "look_label": "Mila",
                "relative_path": "girl_models/slavic/a.webp",
                "liked": False,
                "published_persona_id": None,
            }
        ]
        drafts = {}

        def save(rel, data, **_kwargs):
            drafts[rel] = data
            return rel

        with (
            patch("ai.services.girl_models.read_json_media", side_effect=read_json),
            patch("ai.services.girl_models.write_json_media", side_effect=write_json),
            patch("ai.services.girl_models.media_name_exists", return_value=True),
            patch("ai.services.girl_models.read_media_bytes", return_value=b"webp-bytes"),
            patch("ai.services.girl_models.save_media_bytes", side_effect=save),
            patch(
                "ai.services.girl_models.publish_explore_asset",
                return_value={"published": True, "persona_id": "mila"},
            ) as publish,
            patch(
                "ai.services.girl_models.set_persona_display_label",
                return_value={"persona_id": "mila", "label": "Mila"},
            ) as label,
            patch("ai.services.girl_models.persona_display_label", return_value="Mila"),
        ):
            liked = set_model_liked(model_id="abc123", liked=True)
            item = publish_girl_model(model_id="abc123", persona_id="mila", label="Mila")

        self.assertTrue(liked["liked"])
        self.assertEqual(drafts["explore_gen/mila/reference.webp"], b"webp-bytes")
        publish.assert_called_once_with(persona_id="mila", slug="reference", view="front")
        label.assert_called_once()
        self.assertEqual(item["published_persona_id"], "mila")
        self.assertTrue(item["liked"])

    def test_publish_rejects_men_slot(self):
        state, read_json, write_json = self._library()
        state["items"] = [
            {
                "id": "abc123",
                "look_id": "slavic",
                "look_label": "Mila",
                "relative_path": "girl_models/slavic/a.webp",
                "liked": True,
                "published_persona_id": None,
            }
        ]
        with (
            patch("ai.services.girl_models.read_json_media", side_effect=read_json),
            patch("ai.services.girl_models.write_json_media", side_effect=write_json),
            patch("ai.services.girl_models.read_media_bytes", return_value=b"webp-bytes"),
        ):
            with self.assertRaises(AiStyleError) as ctx:
                publish_girl_model(model_id="abc123", persona_id="irland", label="Mila")
        self.assertEqual(ctx.exception.status, 400)
