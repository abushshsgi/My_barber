from decimal import Decimal
from threading import Lock, Thread
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from ai.services.gemini_tryon import TryOnResult
from ai.services.tryon_queue import (
    DELAYED_KEY,
    PROCESSING_KEY,
    QUEUE_KEY,
    STATUS_COMPLETED,
    STATUS_PENDING,
    STATUS_RETRYING,
    acquire_provider_slot,
    enqueue_tryon_job,
    get_tryon_job,
    is_queue_enabled,
    process_next_tryon_job,
    recover_abandoned_jobs,
    release_provider_slot,
)


def _tryon_result(image="data:image/png;base64,out"):
    return TryOnResult(
        preview_image=image,
        prompt="p",
        model="m",
        provider="vertex",
        prompt_tokens=10,
        candidates_tokens=20,
        thoughts_tokens=0,
        total_tokens=30,
        cost_usd=Decimal("0.01"),
        tokens_estimated=True,
        latency_ms=500,
    )


class FakeRedis:
    def __init__(self):
        self._lock = Lock()
        self.kv = {}
        self.lists = {}
        self.zsets = {}
        self.hashes = {}
        self.pop_calls = 0

    def get(self, key):
        with self._lock:
            return self.kv.get(key)

    def set(self, key, value, nx=False, ex=None, px=None, xx=False):
        with self._lock:
            if nx and key in self.kv:
                return False
            self.kv[key] = value
            return True

    def setex(self, key, _ttl, value):
        with self._lock:
            self.kv[key] = value
            return True

    def delete(self, *keys):
        with self._lock:
            n = 0
            for key in keys:
                if key in self.kv:
                    del self.kv[key]
                    n += 1
                self.lists.pop(key, None)
                self.zsets.pop(key, None)
                self.hashes.pop(key, None)
            return n

    def exists(self, key):
        with self._lock:
            return int(key in self.kv or key in self.lists or key in self.zsets)

    def expire(self, *_a, **_k):
        return True

    def llen(self, key):
        with self._lock:
            return len(self.lists.get(key, []))

    def rpush(self, key, *values):
        with self._lock:
            self.lists.setdefault(key, []).extend(values)
            return len(self.lists[key])

    def lrange(self, key, start, end):
        with self._lock:
            lst = self.lists.get(key, [])
            if end == -1:
                end = len(lst)
            else:
                end = end + 1
            return list(lst[start:end])

    def lpos(self, key, value):
        with self._lock:
            lst = self.lists.get(key, [])
            try:
                return lst.index(value)
            except ValueError:
                return None

    def lrem(self, key, _count, value):
        with self._lock:
            lst = self.lists.get(key, [])
            self.lists[key] = [item for item in lst if item != value]
            return True

    def blpop(self, key, timeout=0):
        self.pop_calls += 1
        with self._lock:
            lst = self.lists.get(key, [])
            if not lst:
                return None
            val = lst.pop(0)
            return (key, val)

    def brpop(self, key, timeout=0):
        self.pop_calls += 1
        with self._lock:
            lst = self.lists.get(key, [])
            if not lst:
                return None
            val = lst.pop()
            return (key, val)

    def zadd(self, key, mapping):
        with self._lock:
            z = self.zsets.setdefault(key, {})
            z.update(mapping)
            return len(mapping)

    def zrem(self, key, member):
        with self._lock:
            z = self.zsets.get(key, {})
            return int(bool(z.pop(member, None)))

    def zcard(self, key):
        with self._lock:
            return len(self.zsets.get(key, {}))

    def zscore(self, key, member):
        with self._lock:
            z = self.zsets.get(key, {})
            return z.get(member)

    def zrange(self, key, start, end):
        with self._lock:
            items = sorted(self.zsets.get(key, {}).items(), key=lambda kv: kv[1])
            names = [name for name, _s in items]
            if end == -1:
                end = len(names)
            else:
                end = end + 1
            return names[start:end]

    def zrangebyscore(self, key, min_s, max_s):
        with self._lock:
            out = []
            for name, score in self.zsets.get(key, {}).items():
                if float(min_s) <= float(score) <= float(max_s):
                    out.append(name)
            return out

    def incr(self, key):
        with self._lock:
            val = int(self.kv.get(key) or 0) + 1
            self.kv[key] = str(val)
            return val

    def decr(self, key):
        with self._lock:
            val = int(self.kv.get(key) or 0) - 1
            self.kv[key] = str(val)
            return val

    def hincrby(self, key, field, amount=1):
        with self._lock:
            h = self.hashes.setdefault(key, {})
            h[field] = int(h.get(field) or 0) + int(amount)
            return h[field]

    def hset(self, key, field, value):
        with self._lock:
            self.hashes.setdefault(key, {})[field] = value
            return 1

    def hgetall(self, key):
        with self._lock:
            return dict(self.hashes.get(key, {}))

    def eval(self, script, numkeys, *args):
        keys = args[:numkeys]
        argv = args[numkeys:]
        if "INCR" in script:
            sem, cd = keys[0], keys[1]
            max_slots = int(argv[0])
            now = float(argv[2])
            cooldown = self.get(cd)
            if cooldown and float(cooldown) > now:
                return [0, float(cooldown)]
            current = int(self.get(sem) or 0)
            if current >= max_slots:
                return [0, 0]
            self.incr(sem)
            return [1, 0]
        if "DECR" in script:
            sem = keys[0]
            current = int(self.get(sem) or 0)
            if current <= 1:
                self.delete(sem)
                return 0
            return self.decr(sem)
        return 0

    def pipeline(self):
        return FakePipeline(self)


class FakePipeline:
    def __init__(self, client: FakeRedis):
        self.client = client
        self.ops = []

    def setex(self, *a, **k):
        self.ops.append(("setex", a, k))
        return self

    def rpush(self, *a, **k):
        self.ops.append(("rpush", a, k))
        return self

    def execute(self):
        out = []
        for name, a, k in self.ops:
            out.append(getattr(self.client, name)(*a, **k))
        self.ops = []
        return out


@override_settings(TRYON_QUEUE_ENABLED=True)
class TryOnQueueSettingsTests(SimpleTestCase):
    @override_settings()
    def test_disabled_without_redis(self):
        with patch("ai.services.tryon_queue.get_redis_url", return_value=""):
            self.assertFalse(is_queue_enabled())

    def test_enabled_with_redis(self):
        with patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0"):
            self.assertTrue(is_queue_enabled())


@override_settings(
    TRYON_QUEUE_ENABLED=True,
    TRYON_QUEUE_MAX_DEPTH=200,
    TRYON_PROVIDER_CONCURRENCY=3,
    TRYON_MAX_RETRIES=4,
    TRYON_DEDUPE_SECONDS=30,
)
class TryOnQueueOpsTests(SimpleTestCase):
    def _mock_redis(self):
        client = MagicMock()
        client.llen.return_value = 0
        client.zcard.return_value = 0
        client.get.return_value = None
        pipe = MagicMock()
        client.pipeline.return_value = pipe
        return client, pipe

    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_enqueue_returns_job_id(self, mock_client_fn, _redis_url, _up, _photo):
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
            '{"job_id":"abc","status":"pending","user_id":7,"style_id":"men-mid-fade",'
            '"style_title":"Mid Fade"}'
        )
        client.lpos.return_value = 2

        job = get_tryon_job("abc", user_id=7)
        self.assertIsNotNone(job)
        self.assertEqual(job["status"], STATUS_PENDING)
        self.assertEqual(job["queue_position"], 3)
        self.assertEqual(job["phase"], "waiting")

    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue._save_result_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue.release_provider_slot")
    @patch("ai.services.tryon_queue.acquire_provider_slot", return_value=True)
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_process_job_completes(
        self,
        mock_client_fn,
        _redis_url,
        mock_tryon,
        _acq,
        _rel,
        _up,
        _photo,
        _ws,
    ):
        mock_tryon.return_value = _tryon_result()
        client = MagicMock()
        mock_client_fn.return_value = client
        client.set.return_value = True
        client.blpop.return_value = ("mysaloon:tryon:queue", "job123")
        client.get.side_effect = [
            '{"job_id":"job123","status":"pending","user_id":1,"style_id":"men-mid-fade","style_title":"Mid Fade"}',
            '{"image":"data:image/png;base64,x","audience":"men","slug":"mid-fade","title":"Mid Fade","reference_image_url":null}',
        ]

        with patch("ai.services.tryon_queue.record_ai_generation"), patch(
            "ai.morph_ops.check_user_can_generate", return_value=None
        ):
            processed = process_next_tryon_job(block_seconds=1)
        self.assertTrue(processed)
        saved = client.setex.call_args_list[-1][0][2]
        self.assertIn(STATUS_COMPLETED, saved)
        self.assertIn("data:image/png;base64,out", saved)


@override_settings(
    TRYON_QUEUE_ENABLED=True,
    TRYON_QUEUE_MAX_DEPTH=200,
    TRYON_PROVIDER_CONCURRENCY=2,
    TRYON_MAX_RETRIES=3,
    TRYON_LEASE_SECONDS=60,
    TRYON_RATE_LIMIT_COOLDOWN=5,
    IMAGE_GENERATION_PROVIDER="auto",
)
class TryOnReliableQueueTests(SimpleTestCase):
    def setUp(self):
        self.redis = FakeRedis()

    def _enqueue_n(self, n, user_id=1, image="data:image/png;base64,abc"):
        ids = []
        for i in range(n):
            ids.append(
                enqueue_tryon_job(
                    user_id=user_id + (i % 7),
                    image=f"{image}-{i}",
                    style_id="men-mid-fade",
                    style_title="Mid Fade",
                    audience="men",
                    slug="mid-fade",
                    reference_image_url=None,
                )
            )
        return ids

    def _run_until_idle(self, max_loops=400):
        processed = 0
        for _ in range(max_loops):
            before = self.redis.pop_calls
            process_next_tryon_job(block_seconds=1)
            if self.redis.pop_calls == before:
                if not self.redis.lists.get(QUEUE_KEY) and not self.redis.zsets.get(DELAYED_KEY):
                    break
            else:
                processed += 1
        return processed

    def test_global_semaphore_caps_provider_slots(self):
        self.assertTrue(acquire_provider_slot(self.redis, "vertex", wait_seconds=0.01))
        self.assertTrue(acquire_provider_slot(self.redis, "vertex", wait_seconds=0.01))
        self.assertFalse(acquire_provider_slot(self.redis, "vertex", wait_seconds=0.05))
        release_provider_slot(self.redis, "vertex")
        self.assertTrue(acquire_provider_slot(self.redis, "vertex", wait_seconds=0.01))

    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_duplicate_submissions_reuse_job(self, mock_client, _url, _ws, _up, _photo):
        mock_client.return_value = self.redis
        first = enqueue_tryon_job(
            user_id=9,
            image="data:image/png;base64,same",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        second = enqueue_tryon_job(
            user_id=9,
            image="data:image/png;base64,same",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        self.assertEqual(first, second)
        self.assertEqual(self.redis.llen(QUEUE_KEY), 1)

    @patch("ai.services.tryon_queue._save_result_photo")
    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_load_10_25_50_no_silent_loss(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in, _out
    ):
        mock_client.return_value = self.redis
        seen = []

        def _gen(**kwargs):
            image = kwargs["selfie_data_url"]
            seen.append(image)
            return _tryon_result(f"data:image/png;base64,out-{len(seen)}")

        mock_tryon.side_effect = _gen
        for n in (10, 25, 50):
            self.redis.lists[QUEUE_KEY] = []
            ids = self._enqueue_n(n, image=f"data:image/png;base64,batch{n}")
            self._run_until_idle()
            self.assertEqual(len(ids), n)
            self.assertEqual(len(set(ids)), n)
            completed = 0
            for job_id in ids:
                raw = self.redis.get(f"mysaloon:tryon:job:{job_id}")
                self.assertIsNotNone(raw)
                self.assertIn(STATUS_COMPLETED, raw)
                completed += 1
            self.assertEqual(completed, n)
            self.assertEqual(self.redis.llen(QUEUE_KEY), 0)

    @patch("ai.services.tryon_queue._save_result_photo")
    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_http_429_requeues_not_drops(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in, _out
    ):
        from ai.services.errors import AiStyleError

        mock_client.return_value = self.redis
        mock_tryon.side_effect = [
            AiStyleError("rate", 429, retry_after=1.0),
            _tryon_result(),
        ]
        job_id = enqueue_tryon_job(
            user_id=3,
            image="data:image/png;base64,r429",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        process_next_tryon_job(block_seconds=1)
        meta = self.redis.get(f"mysaloon:tryon:job:{job_id}")
        self.assertIn(STATUS_RETRYING, meta)
        delayed = self.redis.zsets.get(DELAYED_KEY, {})
        self.assertIn(job_id, delayed)
        delayed[job_id] = 0
        for key in list(self.redis.kv):
            if "cooldown" in key or key.startswith("mysaloon:tryon:sem:"):
                self.redis.kv.pop(key, None)
        for _ in range(6):
            process_next_tryon_job(block_seconds=1)
            meta = self.redis.get(f"mysaloon:tryon:job:{job_id}")
            if meta and STATUS_COMPLETED in meta:
                break
        self.assertIn(STATUS_COMPLETED, meta)

    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_timeout_retries(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in
    ):
        from ai.services.errors import AiStyleError

        mock_client.return_value = self.redis
        mock_tryon.side_effect = AiStyleError("timeout", 504)
        job_id = enqueue_tryon_job(
            user_id=4,
            image="data:image/png;base64,to",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        process_next_tryon_job(block_seconds=1)
        meta = self.redis.get(f"mysaloon:tryon:job:{job_id}")
        self.assertIn(STATUS_RETRYING, meta)

    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_worker_restart_recovers_processing(self, mock_client, _url, _ws, _up, _in):
        mock_client.return_value = self.redis
        job_id = enqueue_tryon_job(
            user_id=5,
            image="data:image/png;base64,restart",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        self.redis.brpop(QUEUE_KEY)
        self.redis.zadd(PROCESSING_KEY, {job_id: 0})
        self.redis.setex(
            f"mysaloon:tryon:job:{job_id}",
            60,
            '{"job_id":"%s","status":"processing","user_id":5,"style_id":"men-mid-fade","style_title":"Mid Fade"}'
            % job_id,
        )
        n = recover_abandoned_jobs(self.redis)
        self.assertGreaterEqual(n, 1)
        self.assertIn(job_id, self.redis.lists.get(QUEUE_KEY, []))

    @patch("ai.services.tryon_queue._save_result_photo")
    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_two_workers_do_not_double_process(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in, _out
    ):
        mock_client.return_value = self.redis
        calls = []

        def _gen(**kwargs):
            calls.append(1)
            return _tryon_result()

        mock_tryon.side_effect = _gen
        enqueue_tryon_job(
            user_id=8,
            image="data:image/png;base64,once",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )

        def _worker():
            process_next_tryon_job(block_seconds=1)

        t1 = Thread(target=_worker)
        t2 = Thread(target=_worker)
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        self.assertEqual(len(calls), 1)

    @patch("ai.services.tryon_queue._save_result_photo")
    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_user_isolation(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in, _out
    ):
        mock_client.return_value = self.redis
        mock_tryon.return_value = _tryon_result("data:image/png;base64,user1")
        job_id = enqueue_tryon_job(
            user_id=11,
            image="data:image/png;base64,u1",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        process_next_tryon_job(block_seconds=1)
        own = get_tryon_job(job_id, user_id=11)
        other = get_tryon_job(job_id, user_id=99)
        self.assertIsNotNone(own)
        self.assertEqual(own["preview_image"], "data:image/png;base64,user1")
        self.assertIsNone(other)

    @patch("ai.services.tryon_queue._save_input_photo")
    @patch("ai.services.tryon_queue._durable_upsert")
    @patch("ai.services.tryon_queue._notify_user")
    @patch("ai.services.tryon_queue.generate_tryon_preview")
    @patch("ai.morph_ops.check_user_can_generate", return_value=None)
    @patch("ai.services.tryon_queue.record_ai_generation")
    @patch("ai.services.tryon_queue.get_redis_url", return_value="redis://localhost:6379/0")
    @patch("ai.services.tryon_queue._redis_client")
    def test_permanent_error_does_not_retry_forever(
        self, mock_client, _url, _rec, _chk, mock_tryon, _ws, _up, _in
    ):
        from ai.services.errors import AiStyleError

        mock_client.return_value = self.redis
        mock_tryon.side_effect = AiStyleError("model missing", 404, retryable=False)
        job_id = enqueue_tryon_job(
            user_id=12,
            image="data:image/png;base64,badmodel",
            style_id="men-mid-fade",
            style_title="Mid Fade",
            audience="men",
            slug="mid-fade",
            reference_image_url=None,
        )
        process_next_tryon_job(block_seconds=1)
        meta = self.redis.get(f"mysaloon:tryon:job:{job_id}")
        self.assertIn("failed", meta)
        self.assertEqual(mock_tryon.call_count, 1)
