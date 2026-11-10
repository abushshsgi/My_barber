"""Morf Try-On Runware contract tests. No live Runware account is required."""

from __future__ import annotations

import json
from decimal import Decimal
from io import BytesIO
from unittest.mock import MagicMock, patch

import requests
from django.test import SimpleTestCase, override_settings
from PIL import Image

from ai.services.errors import AiStyleError

TINY_PNG = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


def _jpeg_bytes() -> bytes:
    return _jpeg_bytes_color((90, 70, 60), (32, 32))


def _jpeg_bytes_color(color: tuple[int, int, int], size: tuple[int, int]) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, color).save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def _solid_jpeg(color: tuple[int, int, int], size: tuple[int, int]) -> bytes:
    return _jpeg_bytes_color(color, size)


def _jpeg_of(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()


def _data_url(raw: bytes) -> str:
    import base64

    return "data:image/jpeg;base64," + base64.b64encode(raw).decode("ascii")


class _Response:
    def __init__(self, status, payload, headers=None, text=None):
        self.status_code = status
        self._payload = payload
        self.headers = headers or {}
        self.text = text if text is not None else json.dumps(payload)

    def json(self):
        if isinstance(self._payload, Exception):
            raise self._payload
        return self._payload


@override_settings(
    TRYON_PROVIDER="runware",
    RUNWARE_API_KEY="super-secret-key",
    RUNWARE_API_URL="https://api.runware.ai/v1",
    RUNWARE_TRYON_MODEL="runware:400@6",
    RUNWARE_TRYON_FALLBACK_MODELS="runware:400@2,runware:400@4",
    RUNWARE_TRYON_WIDTH=1024,
    RUNWARE_TRYON_HEIGHT=1024,
    RUNWARE_TRYON_TIMEOUT=30,
    RUNWARE_TRYON_CFG_SCALE="3.5",
    RUNWARE_TRYON_NEGATIVE_PROMPT_ENABLED=True,
    RUNWARE_TRYON_SEED_MODE="auto",
    RUNWARE_TRYON_SCHEDULER="default",
    RUNWARE_TRYON_OUTPUT_FORMAT="PNG",
    RUNWARE_TRYON_STRENGTH="0.45",
    RUNWARE_TRYON_OVERFLOW_DEPTH="8",
    TRYON_PROVIDER_CONCURRENCY=8,
    MEDIA_URL="/media/",
)
class RunwareTryOnTests(SimpleTestCase):
    def test_1024_is_inside_model_limits(self):
        from ai.services.runware_tryon import resolved_tryon_size, snap_dimension

        self.assertEqual(resolved_tryon_size("runware:400@6"), (1024, 1024))
        self.assertEqual(snap_dimension(1000), 992)
        self.assertEqual(snap_dimension(1024), 1024)

    def test_output_size_follows_selfie_aspect(self):
        from ai.services.runware_tryon import _output_size_for_bytes

        buffer = BytesIO()
        Image.new("RGB", (768, 1024), (90, 70, 60)).save(buffer, format="JPEG", quality=80)
        self.assertEqual(_output_size_for_bytes(buffer.getvalue(), "runware:400@6"), (768, 1024))

    def test_output_size_keeps_landscape_ratio(self):
        from ai.services.runware_tryon import _output_size_for_bytes

        buffer = BytesIO()
        Image.new("RGB", (1600, 900), (90, 70, 60)).save(buffer, format="JPEG", quality=80)
        self.assertEqual(_output_size_for_bytes(buffer.getvalue(), "runware:400@6"), (1024, 576))

    @override_settings(RUNWARE_TRYON_WIDTH=1152, RUNWARE_TRYON_HEIGHT=1536)
    def test_output_size_scales_portrait_taller(self):
        from ai.services.runware_tryon import _output_size_for_bytes

        buffer = BytesIO()
        Image.new("RGB", (768, 1024), (90, 70, 60)).save(buffer, format="JPEG", quality=80)
        self.assertEqual(_output_size_for_bytes(buffer.getvalue(), "runware:400@6"), (1152, 1536))

    def test_output_size_keeps_square_selfie(self):
        from ai.services.runware_tryon import _output_size_for_bytes

        buffer = BytesIO()
        Image.new("RGB", (1024, 1024), (90, 70, 60)).save(buffer, format="JPEG", quality=80)
        with override_settings(RUNWARE_TRYON_WIDTH=1152, RUNWARE_TRYON_HEIGHT=1536):
            self.assertEqual(_output_size_for_bytes(buffer.getvalue(), "runware:400@6"), (1536, 1536))

    def test_prepare_selfie_does_not_pad_above_the_hair(self):
        from ai.services.runware_tryon import prepare_selfie_bytes

        image = Image.new("RGB", (900, 700), (90, 70, 60))
        image.paste((255, 0, 0), (440, 0, 461, 8))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        raw = buffer.getvalue()
        prepared = prepare_selfie_bytes(raw, style_detail="mid fade")
        self.assertEqual(prepared.crop_strategy, "none")
        self.assertFalse(prepared.exif_transposed)
        self.assertEqual(prepared.payload, raw)
        opened = Image.open(BytesIO(prepared.payload))
        self.assertEqual(opened.size, (900, 700))
        self.assertGreater(opened.getpixel((450, 1))[0], 200)

    def test_unverified_model_is_rejected_before_http(self):
        from ai.services.runware_tryon import generate_tryon_preview

        session = MagicMock()
        with override_settings(RUNWARE_TRYON_MODEL="runware:999@1"), patch(
            "ai.services.runware_client.http_session", return_value=session
        ):
            with self.assertRaises(AiStyleError) as ctx:
                generate_tryon_preview(
                    selfie_data_url=TINY_PNG,
                    audience="men",
                    slug="mid-fade",
                    title="Mid Fade",
                )
        self.assertEqual(ctx.exception.status, 503)
        self.assertFalse(ctx.exception.retryable)
        session.post.assert_not_called()

    def test_wrong_provider_does_not_call_gemini(self):
        from ai.services.runware_tryon import generate_tryon_preview

        with override_settings(TRYON_PROVIDER="gemini"), patch(
            "ai.services.vertex_image.generate_image_content"
        ) as vertex:
            with self.assertRaises(AiStyleError) as ctx:
                generate_tryon_preview(
                    selfie_data_url=TINY_PNG,
                    audience="men",
                    slug="mid-fade",
                    title="Mid Fade",
                )
        self.assertEqual(ctx.exception.status, 503)
        vertex.assert_not_called()

    @patch("media_store.utils.save_media_bytes", return_value="stored.jpg")
    @patch("ai.services.runware_tryon.download_image")
    @patch("ai.services.runware_tryon.run_image_inference")
    @patch("ai.services.vertex_image.generate_image_content")
    def test_preview_uses_reference_images_and_local_media(
        self, vertex, infer, download, _save
    ):
        from ai.services.runware_tryon import generate_tryon_preview

        download.return_value = _jpeg_bytes()
        infer.return_value = {
            "imageURL": "https://im.runware.ai/image/example.jpg",
            "cost": 0.0012,
            "seed": 7,
        }
        with patch(
            "ai.services.runware_tryon.load_public_image",
            return_value=("image/png", _jpeg_bytes()),
        ):
            result = generate_tryon_preview(
                selfie_data_url=TINY_PNG,
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
                reference_image_url="/hairstyles/men/mid-fade.webp",
            )

        vertex.assert_not_called()
        task = infer.call_args.args[0]
        refs = task["inputs"]["referenceImages"]
        self.assertEqual(task["model"], "runware:400@6")
        self.assertEqual(len(refs), 1)
        self.assertTrue(all(item.startswith("data:image/jpeg;base64,") for item in refs))
        self.assertNotIn("seedImage", task)
        self.assertNotIn("strength", task)
        self.assertNotIn("mask", task)
        self.assertNotIn("maskImage", task)
        self.assertNotIn("inpaintingMask", task)
        self.assertNotIn("seed", task)
        self.assertNotIn("scheduler", task)
        self.assertEqual(task["steps"], 4)
        self.assertEqual(task["CFGScale"], 3.5)
        self.assertEqual(task["outputFormat"], "PNG")
        self.assertNotIn("outputQuality", task)
        self.assertLessEqual(len(task["positivePrompt"]), 10000)
        self.assertLessEqual(len(task["negativePrompt"]), 3000)
        self.assertGreaterEqual(len(task["negativePrompt"]), 2)
        prompt = task["positivePrompt"].lower()
        self.assertIn("reference image 1", prompt)
        self.assertNotIn("reference image 2", prompt)
        self.assertIn("critical identity preservation", prompt)
        self.assertIn("critical original hair color preservation", prompt)
        self.assertIn("mid fade", prompt)
        self.assertIn("change only the hairstyle", prompt)
        self.assertTrue(result.preview_image.startswith("/media/ai-style/tryon-results/"))
        self.assertNotIn("runware.ai", result.preview_image)
        self.assertNotIn("super-secret-key", result.preview_image)
        self.assertEqual(result.provider, "runware")
        self.assertEqual(result.cost_usd, Decimal("0.0012"))
        self.assertFalse(result.tokens_estimated)
        self.assertGreaterEqual(result.latency_ms, 0)
        download.assert_called_once_with("https://im.runware.ai/image/example.jpg")

    @patch("media_store.utils.save_media_bytes", return_value="stored.jpg")
    @patch("ai.services.runware_tryon.download_image")
    @patch("ai.services.runware_tryon.run_image_inference")
    def test_full_model_switches_to_the_next_without_waiting(self, infer, download, _save):
        from ai.services.errors import AiStyleError
        from ai.services.runware_tryon import generate_tryon_preview

        download.return_value = _jpeg_bytes()
        infer.side_effect = [
            AiStyleError("Try-on hozir band.", 429, retryable=True),
            AiStyleError("Try-on modeli topilmadi.", 400, retryable=False),
            {"imageURL": "https://im.runware.ai/image/fallback.jpg", "cost": 0.002},
        ]
        result = generate_tryon_preview(
            selfie_data_url=TINY_PNG,
            audience="men",
            slug="mid-fade",
            title="Mid Fade",
        )
        self.assertEqual(result.model, "runware:400@4")
        self.assertEqual(infer.call_count, 3)
        self.assertEqual(
            [call.args[0]["model"] for call in infer.call_args_list],
            ["runware:400@6", "runware:400@2", "runware:400@4"],
        )

    def test_default_chain_is_kv_then_two_reserves(self):
        from ai.services.runware_tryon import tryon_model_chain, tryon_model_chain_for_pressure

        self.assertEqual(
            tryon_model_chain(),
            ["runware:400@6", "runware:400@2", "runware:400@4"],
        )
        self.assertEqual(
            tryon_model_chain_for_pressure(1),
            ["runware:400@6", "runware:400@2", "runware:400@4"],
        )
        self.assertEqual(tryon_model_chain_for_pressure(9)[0], "runware:400@2")
        self.assertEqual(tryon_model_chain_for_pressure(10)[0], "runware:400@4")
        self.assertIn("runware:400@6", tryon_model_chain_for_pressure(9))

    def test_unsupported_parameter_is_not_reported_as_a_missing_model(self):
        from ai.services.runware_client import run_image_inference

        session = MagicMock()
        session.post.return_value = _Response(
            400,
            {
                "errors": [
                    {
                        "code": "unsupportedParameter",
                        "message": "Parameter seedImage is not supported for this model",
                    }
                ]
            },
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertRaises(AiStyleError) as ctx:
                run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 400)
        self.assertNotIn("RUNWARE_TRYON_MODEL", ctx.exception.message)

    def test_rate_limit_is_single_attempt(self):
        from ai.services.runware_client import run_image_inference

        session = MagicMock()
        session.post.return_value = _Response(
            429,
            {"errors": [{"code": "rateLimitExceeded", "message": "slow down"}]},
            headers={"Retry-After": "4"},
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertRaises(AiStyleError) as ctx:
                run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 429)
        self.assertTrue(ctx.exception.retryable)
        self.assertEqual(ctx.exception.retry_after, 4.0)
        self.assertEqual(session.post.call_count, 1)
        self.assertNotIn("super-secret-key", ctx.exception.message)

    def test_timeout_and_invalid_key_are_not_retried_inside_client(self):
        from ai.services.runware_client import run_image_inference

        session = MagicMock()
        session.post.side_effect = requests.Timeout("super-secret-key timed out")
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertLogs("ai.services.runware_client", level="WARNING") as logs:
                with self.assertRaises(AiStyleError) as ctx:
                    run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 504)
        self.assertTrue(ctx.exception.retryable)
        self.assertEqual(session.post.call_count, 1)
        self.assertNotIn("super-secret-key", "\n".join(logs.output))
        self.assertNotIn("super-secret-key", ctx.exception.message)

        session.post.side_effect = None
        session.post.return_value = _Response(
            401,
            {"errors": [{"code": "invalidApiKey", "message": "rejected super-secret-key"}]},
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertLogs("ai.services.runware_client", level="WARNING") as logs:
                with self.assertRaises(AiStyleError) as ctx:
                    run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 401)
        self.assertFalse(ctx.exception.retryable)
        self.assertNotIn("super-secret-key", ctx.exception.message)
        self.assertNotIn("super-secret-key", "\n".join(logs.output))

    def test_insufficient_balance_empty_result_and_bad_download(self):
        from ai.services.runware_client import download_image, run_image_inference

        session = MagicMock()
        session.post.return_value = _Response(
            402,
            {"errors": [{"code": "insufficientCredits", "message": "top up"}]},
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertRaises(AiStyleError) as ctx:
                run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 402)
        self.assertFalse(ctx.exception.retryable)

        session.post.return_value = _Response(200, {"data": []})
        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertRaises(AiStyleError) as ctx:
                run_image_inference({"model": "runware:400@2", "positivePrompt": "edit"})
        self.assertEqual(ctx.exception.status, 502)

        with patch("ai.services.runware_client.http_session", return_value=session):
            with self.assertRaises(AiStyleError) as ctx:
                download_image("https://evil.example/photo.jpg")
        self.assertEqual(ctx.exception.status, 502)
        session.get.assert_not_called()

    def test_inference_posts_official_task_once(self):
        from ai.services.runware_client import run_image_inference

        session = MagicMock()
        session.post.return_value = _Response(
            200,
            {"data": [{"taskType": "imageInference", "imageURL": "https://im.runware.ai/image/ii/x.jpg"}]},
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            result = run_image_inference(
                {
                    "model": "runware:400@2",
                    "positivePrompt": "edit reference image 1",
                    "width": 1024,
                    "height": 1024,
                    "inputs": {"referenceImages": ["data:image/jpeg;base64,abcd"]},
                }
            )
        self.assertEqual(result["imageURL"], "https://im.runware.ai/image/ii/x.jpg")
        self.assertEqual(session.post.call_count, 1)
        url = session.post.call_args.args[0]
        body = session.post.call_args.kwargs["json"][0]
        headers = session.post.call_args.kwargs["headers"]
        self.assertEqual(url, "https://api.runware.ai/v1")
        self.assertEqual(body["taskType"], "imageInference")
        self.assertEqual(body["model"], "runware:400@2")
        self.assertEqual(body["outputFormat"], "JPG")
        self.assertEqual(body["inputs"]["referenceImages"], ["data:image/jpeg;base64,abcd"])
        self.assertEqual(headers["Authorization"], "Bearer super-secret-key")
        self.assertNotIn("generativelanguage.googleapis.com", url)

    def test_queue_backoff_stays_bounded(self):
        from ai.services.tryon_queue import _provider_backoff_seconds

        with override_settings(TRYON_RATE_LIMIT_COOLDOWN=15):
            early = _provider_backoff_seconds(1, None)
            later = _provider_backoff_seconds(10, 2)
        self.assertGreaterEqual(early, 15)
        self.assertGreater(later, early)
        self.assertLessEqual(later, 120)

    def test_png_task_overrides_client_jpg_default(self):
        from ai.services.runware_client import run_image_inference

        session = MagicMock()
        session.post.return_value = _Response(
            200,
            {"data": [{"imageURL": "https://im.runware.ai/image/ii/x.jpg"}]},
        )
        with patch("ai.services.runware_client.http_session", return_value=session):
            run_image_inference(
                {
                    "model": "runware:400@6",
                    "positivePrompt": "edit",
                    "outputFormat": "PNG",
                }
            )
        body = session.post.call_args.kwargs["json"][0]
        self.assertEqual(body["outputFormat"], "PNG")

    def test_cfg_seed_scheduler_and_strength_contract(self):
        from ai.services.runware_tryon import (
            build_tryon_task,
            resolved_cfg_scale,
            resolved_scheduler,
            resolved_seed,
        )

        for value in ("3.0", "3.25", "3.5", "3.75", "4.0", "4.5"):
            with override_settings(RUNWARE_TRYON_CFG_SCALE=value):
                self.assertEqual(resolved_cfg_scale(), float(value))
        with override_settings(RUNWARE_TRYON_CFG_SCALE="99"):
            self.assertIsNone(resolved_cfg_scale())
        with override_settings(RUNWARE_TRYON_CFG_SCALE="nope"):
            self.assertIsNone(resolved_cfg_scale())

        self.assertIsNone(resolved_seed())
        self.assertIsNone(resolved_scheduler())
        with override_settings(RUNWARE_TRYON_SEED_MODE="fixed", RUNWARE_TRYON_TEST_SEED="12345"):
            self.assertEqual(resolved_seed(), 12345)
        with override_settings(RUNWARE_TRYON_SEED_MODE="fixed", RUNWARE_TRYON_TEST_SEED="-1"):
            self.assertIsNone(resolved_seed())
        with override_settings(RUNWARE_TRYON_SCHEDULER="Euler"):
            self.assertEqual(resolved_scheduler(), "Euler")
        with override_settings(RUNWARE_TRYON_SCHEDULER="not-a-scheduler"):
            self.assertIsNone(resolved_scheduler())

        task = build_tryon_task(
            model="runware:400@6",
            prompt="edit",
            width=1024,
            height=1024,
            references=["data:image/jpeg;base64,abcd"],
        )
        self.assertNotIn("strength", task)
        self.assertNotIn("seedImage", task)
        self.assertNotIn("mask", task)
        self.assertNotIn("maskImage", task)
        self.assertNotIn("inpaintingMask", task)
        with override_settings(RUNWARE_TRYON_OUTPUT_FORMAT="JPG"):
            jpg_task = build_tryon_task(
                model="runware:400@6",
                prompt="edit",
                width=1024,
                height=1024,
                references=["data:image/jpeg;base64,abcd"],
            )
        self.assertEqual(jpg_task["outputFormat"], "JPG")
        self.assertEqual(jpg_task["outputQuality"], 95)

    def test_prompts_cover_color_catalog_and_limits(self):
        from ai.services.tryon_prompts import (
            NEGATIVE_PROMPT,
            REFERENCE_IMAGE_PROMPT,
            build_tryon_prompt,
        )
        from ai.services.runware_tryon import build_tryon_task

        plain = build_tryon_prompt(title="Mid Fade", style_detail="mid fade haircut, clean taper")
        self.assertIn("CRITICAL ORIGINAL HAIR COLOR PRESERVATION", plain)
        self.assertIn("mid fade haircut", plain)
        self.assertIn("CRITICAL IDENTITY PRESERVATION", plain)
        self.assertNotIn("catalog image is a hairstyle reference only", plain.lower())
        self.assertLessEqual(len(plain), 10000)

        dyed = build_tryon_prompt(
            title="Balayage",
            style_detail="long hair with natural balayage highlights",
        )
        self.assertNotIn("CRITICAL ORIGINAL HAIR COLOR PRESERVATION", dyed)
        self.assertIn("SELECTED HAIRSTYLE COLOR TREATMENT", dyed)

        chosen = build_tryon_prompt(
            title="Soft Bob",
            style_detail="soft bob haircut",
            selected_hair_color="copper",
        )
        self.assertIn('explicitly requested this hair color: "copper"', chosen)
        self.assertNotIn("CRITICAL ORIGINAL HAIR COLOR PRESERVATION", chosen)
        self.assertNotIn("SELECTED HAIRSTYLE COLOR TREATMENT", chosen)

        with_catalog = build_tryon_prompt(
            title="Mid Fade",
            style_detail="mid fade",
            include_catalog_image=True,
        )
        self.assertIn(REFERENCE_IMAGE_PROMPT.strip()[:40], with_catalog)
        self.assertLessEqual(len(NEGATIVE_PROMPT.strip()), 3000)

        with override_settings(RUNWARE_TRYON_NEGATIVE_PROMPT="x" * 3001):
            task = build_tryon_task(
                model="runware:400@6",
                prompt="edit",
                width=1024,
                height=1024,
                references=["data:image/jpeg;base64,abcd"],
            )
        self.assertNotIn("negativePrompt", task)
        with override_settings(RUNWARE_TRYON_CFG_SCALE="1"):
            disabled = build_tryon_task(
                model="runware:400@6",
                prompt="edit",
                width=1024,
                height=1024,
                references=["data:image/jpeg;base64,abcd"],
            )
        self.assertNotIn("negativePrompt", disabled)

    @patch("ai.services.runware_tryon.run_image_inference")
    def test_validation_error_does_not_call_reserve_models(self, infer):
        from ai.services.runware_tryon import generate_tryon_preview

        infer.side_effect = AiStyleError("Rasm qabul qilinmadi.", 400, retryable=False)
        with self.assertRaises(AiStyleError):
            generate_tryon_preview(
                selfie_data_url=TINY_PNG,
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertEqual(infer.call_count, 1)

    def test_long_hair_gets_bottom_room_without_moving_the_forehead(self):
        from ai.services.runware_tryon import prepare_selfie_bytes

        image = Image.new("RGB", (800, 800), (20, 20, 20))
        image.paste((255, 0, 0), (0, 0, 16, 16))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        prepared = prepare_selfie_bytes(
            buffer.getvalue(),
            style_detail="long layered hair below the shoulders",
        )
        opened = Image.open(BytesIO(prepared.payload))
        self.assertEqual(prepared.crop_strategy, "bottom_length")
        self.assertEqual(opened.size[0], 800)
        self.assertEqual(opened.size[1], 800 + int(800 * 0.12))
        self.assertGreater(opened.getpixel((4, 4))[0], 200)

    def test_wide_frame_crops_sides_and_keeps_the_top_row(self):
        from ai.services.runware_tryon import prepare_selfie_bytes

        image = Image.new("RGB", (900, 500), (10, 20, 30))
        image.paste((255, 0, 0), (440, 0, 461, 6))
        image.paste((0, 255, 0), (0, 240, 12, 260))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        prepared = prepare_selfie_bytes(buffer.getvalue(), style_detail="mid fade")
        opened = Image.open(BytesIO(prepared.payload))
        self.assertEqual(prepared.crop_strategy, "horizontal_portrait")
        self.assertEqual(opened.size[1], 500)
        self.assertLess(opened.size[0], 900)
        self.assertGreater(max(opened.getpixel((x, 1))[0] for x in range(opened.size[0])), 200)
        self.assertLess(opened.getpixel((0, 250))[1], 80)

    def test_exif_orientation_swaps_axes_without_extra_headroom(self):
        from ai.services.runware_tryon import prepare_selfie_bytes

        image = Image.new("RGB", (80, 40), (0, 0, 180))
        exif = Image.Exif()
        exif[274] = 6
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=95, exif=exif)
        prepared = prepare_selfie_bytes(buffer.getvalue())
        self.assertTrue(prepared.exif_transposed)
        self.assertEqual(prepared.exif_orientation, 6)
        self.assertEqual((prepared.normalized_width, prepared.normalized_height), (40, 80))

    def test_equivalent_camera_and_gallery_bytes_share_one_payload(self):
        from ai.services.runware_tryon import (
            DOCUMENTED_TASK_FIELDS,
            FORBIDDEN_TASK_KEYS,
            _output_size_for_bytes,
            build_tryon_task,
            prepare_selfie_bytes,
            tryon_diagnostic_record,
        )

        image = Image.new("RGB", (900, 700), (90, 70, 60))
        buffer = BytesIO()
        image.save(buffer, format="JPEG", quality=95)
        raw = buffer.getvalue()
        camera = prepare_selfie_bytes(raw, style_detail="mid fade")
        gallery = prepare_selfie_bytes(raw, style_detail="mid fade")
        self.assertEqual(camera.payload, gallery.payload)
        self.assertEqual(
            (camera.normalized_width, camera.normalized_height),
            (gallery.normalized_width, gallery.normalized_height),
        )
        width, height = _output_size_for_bytes(camera.payload, "runware:400@6")
        camera_task = build_tryon_task(
            model="runware:400@6",
            prompt="edit reference image 1",
            width=width,
            height=height,
            references=["data:image/jpeg;base64,abcd"],
        )
        gallery_task = build_tryon_task(
            model="runware:400@6",
            prompt="edit reference image 1",
            width=width,
            height=height,
            references=["data:image/jpeg;base64,abcd"],
        )
        self.assertEqual(camera_task["width"], gallery_task["width"])
        self.assertEqual(camera_task["height"], gallery_task["height"])
        self.assertEqual(camera_task.keys(), gallery_task.keys())
        self.assertTrue(set(camera_task).issubset(DOCUMENTED_TASK_FIELDS))
        for key in FORBIDDEN_TASK_KEYS:
            self.assertNotIn(key, camera_task)
        record = tryon_diagnostic_record(
            input_source="camera",
            original_width=camera.original_width,
            original_height=camera.original_height,
            normalized_width=camera.normalized_width,
            normalized_height=camera.normalized_height,
            image_format=camera.image_format,
            exif_orientation=camera.exif_orientation,
            exif_transposed=camera.exif_transposed,
            mirror_correction="client",
            jpeg_quality=camera.jpeg_quality,
            crop_strategy=camera.crop_strategy,
            model="runware:400@6",
            quality_result="skipped",
        )
        blob = json.dumps(record)
        self.assertNotIn("data:image", blob)
        self.assertNotIn("base64", blob)
        self.assertNotIn(raw.hex(), blob)

    def test_style_prompts_protect_forehead_hairline_and_curl_shape(self):
        from ai.services.tryon_prompts import build_tryon_prompt

        curly = build_tryon_prompt(
            title="Curly top fade",
            style_detail="defined curly top with a mid fade",
        )
        self.assertIn("FOREHEAD, HAIRLINE, AND HEAD ANATOMY", curly)
        self.assertIn("CURLY HAIRSTYLE", curly)
        self.assertIn("FADE HAIRSTYLE", curly)
        self.assertIn("Do not stack tight spirals", curly)
        self.assertLessEqual(len(curly), 10000)

        straight = build_tryon_prompt(title="Blunt bob", style_detail="straight blunt bob")
        self.assertIn("STRAIGHT HAIRSTYLE", straight)
        self.assertNotIn("CURLY HAIRSTYLE", straight)

        slick = build_tryon_prompt(title="Slick back", style_detail="slicked hair close to the scalp")
        self.assertIn("SLICKED HAIRSTYLE", slick)
        self.assertNotIn("STRAIGHT HAIRSTYLE", slick)
        self.assertIn("Do not push the hairline back", slick)

    def test_face_restore_keeps_aligned_skin_and_skips_a_moved_face(self):
        from ai.services.tryon_preserve import preserve_face

        original = _solid_jpeg((220, 180, 150), (320, 400))
        edited = _solid_jpeg((206, 166, 136), (320, 400))
        restored, report = preserve_face(original, edited, apply=True)
        self.assertEqual(report["status"], "restored")
        self.assertTrue(report["applied"])
        center = Image.open(BytesIO(restored)).getpixel((160, 230))
        self.assertLess(abs(center[0] - 220), 15)

        source = Image.new("RGB", (320, 400), (20, 40, 180))
        source.paste((220, 180, 150), (60, 120, 150, 280))
        shifted = Image.new("RGB", (320, 400), (20, 40, 180))
        shifted.paste((220, 180, 150), (180, 120, 270, 280))
        source_bytes = _jpeg_of(source)
        shifted_bytes = _jpeg_of(shifted)
        kept, failed = preserve_face(source_bytes, shifted_bytes, apply=True)
        self.assertEqual(failed["status"], "failed")
        self.assertFalse(failed["applied"])
        self.assertEqual(kept, shifted_bytes)

    @patch("media_store.utils.save_media_bytes", return_value="stored.jpg")
    @patch("ai.services.runware_tryon.download_image")
    @patch("ai.services.runware_tryon.run_image_inference")
    def test_quality_retry_stays_off_unless_explicitly_enabled(self, infer, download, _save):
        from ai.services.runware_tryon import generate_tryon_preview

        skin = _data_url(_solid_jpeg((220, 180, 150), (320, 400)))
        blue = _jpeg_bytes_color((20, 40, 180), (320, 400))
        download.return_value = blue
        infer.return_value = {"imageURL": "https://im.runware.ai/image/example.jpg", "cost": 0.001}
        generate_tryon_preview(
            selfie_data_url=skin,
            audience="men",
            slug="mid-fade",
            title="Mid Fade",
        )
        self.assertEqual(infer.call_count, 1)
        self.assertNotIn("strength", infer.call_args.args[0])

        infer.reset_mock()
        download.reset_mock()
        download.side_effect = [blue, blue]
        infer.return_value = {"imageURL": "https://im.runware.ai/image/example.jpg", "cost": 0.001}
        with override_settings(RUNWARE_TRYON_QUALITY_RETRY=True, TRYON_FACE_RESTORE=True):
            generate_tryon_preview(
                selfie_data_url=skin,
                audience="men",
                slug="mid-fade",
                title="Mid Fade",
            )
        self.assertEqual(infer.call_count, 2)
        self.assertIn("SAFER REVISION", infer.call_args_list[1].args[0]["positivePrompt"])
        self.assertNotIn("strength", infer.call_args_list[1].args[0])
        self.assertNotIn("mask", infer.call_args_list[1].args[0])
