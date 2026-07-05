from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from ai.services.tryon_queue import (
    STATUS_COMPLETED,
    STATUS_QUEUED,
    enqueue_tryon_job,
    get_tryon_job,
    is_queue_enabled,
    process_next_tryon_job,
)


@override_settings(TRYON_QUEUE_ENABLED=True)
class TryOnQueueSettingsTests(SimpleTestCase):
    @override_settings()
    def test_disabled_without_redis(self):
        with patch("ai.services.tryon_queue.get_redis_url", return_value=""):
            self.assertFalse(is_queue_enabled())

    def test_enabled_with_redis(self):
        with patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0"):
            self.assertTrue(is_queue_enabled())


@override_settings(TRYON_QUEUE_ENABLED=True, TRYON_QUEUE_MAX_DEPTH=200)
class TryOnQueueOpsTests(SimpleTestCase):
    def _mock_redis(self):
        client = MagicMock()
        client.llen.return_value = 0
        pipe = MagicMock()
        client.pipeline.return_value = pipe
        return client, pipe

    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_enqueue_returns_job_id(self, mock_client_fn, _redis_url):
        client, pipe = self._mock_redis()
        mock_client_fn.return_value = client

        job_id = enqueue_tryon_job(
            user_id=1,
            image="data:image/png;base64,abc",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url="/hairstyles/men/mid-fade.webp",
        )
        self.assertEqual(len(job_id), 32)
        pipe.setex.assert_called()
        pipe.rpush.assert_called_once()

    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_get_job_for_owner(self, mock_client_fn, _redis_url):
        client = MagicMock()
        mock_client_fn.return_value = client
        client.get.return_value = (
            '{"job_id":"abc","status":"queued","user_id":7,"style_id":"men-mid-fade",'
            '"style_title":"Mid Fade"}'
        )
        client.lpos.return_value = 2

        job = get_tryon_job("abc", user_id=7)
        self.assertIsNotNone(job)
        self.assertEqual(job["status"], STATUS_QUEUED)
        self.assertEqual(job["queue_position"], 3)

    @patch("ai.services.tryon_queue.generate_tryon_preview", return_value="data:image/png;base64,out")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_process_job_completes(self, mock_client_fn, _redis_url, _mock_tryon):
        client = MagicMock()
        mock_client_fn.return_value = client
        client.brpop.return_value = ("mysaloon:tryon:queue", "job123")
        client.get.side_effect = [
            '{"job_id":"job123","status":"queued","user_id":1,"style_id":"men-mid-fade","style_title":"Mid Fade"}',
            '{"image":"data:image/png;base64,x","audience":"men","slug":"mid-fade","title":"Mid Fade","reference_image_url":null}',
        ]

        processed = process_next_tryon_job(block_seconds=1)
        self.assertTrue(processed)
        saved = client.setex.call_args_list[-1][0][2]
        self.assertIn(STATUS_COMPLETED, saved)
        self.assertIn("data:image/png;base64,out", saved)
