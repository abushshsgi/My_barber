"""Redis navbat — try-on worker (thread pool: bir vaqtda ko'p Vertex chaqiruv)."""

from __future__ import annotations

import logging
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

from django.conf import settings
from django.core.management.base import BaseCommand

from ai.services.tryon_queue import is_queue_enabled, process_next_tryon_job

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Try-on Redis navbatini tinglaydi va Vertex generatsiyani bajaradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--poll-seconds",
            type=int,
            default=5,
            help="BRPOP timeout (default: 5)",
        )
        parser.add_argument(
            "--concurrency",
            type=int,
            default=None,
            help="Parallel job threads (default: TRYON_WORKER_CONCURRENCY).",
        )

    def handle(self, *args, **options):
        if not is_queue_enabled():
            self.stderr.write("REDIS_URL yo'q yoki TRYON_QUEUE_ENABLED=false — worker to'xtatildi.")
            return

        poll = max(1, int(options["poll_seconds"]))
        configured = int(getattr(settings, "TRYON_WORKER_CONCURRENCY", 16) or 16)
        raw = options["concurrency"]
        concurrency = max(1, min(int(raw if raw is not None else configured), 32))
        self.stdout.write(f"Try-on worker ishga tushdi (poll={poll}s, concurrency={concurrency})...")

        if concurrency == 1:
            self._run_serial(poll)
            return
        self._run_pool(poll, concurrency)

    def _run_serial(self, poll: int) -> None:
        while True:
            try:
                process_next_tryon_job(block_seconds=poll)
            except KeyboardInterrupt:
                self.stdout.write("Try-on worker to'xtatildi.")
                return
            except Exception as exc:
                if self._is_idle_timeout(exc):
                    continue
                logger.exception("Try-on worker loop error: %s", exc)
                time.sleep(2)

    def _run_pool(self, poll: int, concurrency: int) -> None:
        pending: set = set()
        with ThreadPoolExecutor(max_workers=concurrency, thread_name_prefix="tryon") as pool:
            try:
                while True:
                    while len(pending) < concurrency:
                        pending.add(pool.submit(self._safe_process, poll))
                    done, pending = wait(pending, return_when=FIRST_COMPLETED)
                    for fut in done:
                        try:
                            fut.result()
                        except KeyboardInterrupt:
                            raise
                        except Exception as exc:
                            if self._is_idle_timeout(exc):
                                continue
                            logger.exception("Try-on worker thread error: %s", exc)
            except KeyboardInterrupt:
                self.stdout.write("Try-on worker to'xtatildi.")

    @staticmethod
    def _safe_process(poll: int) -> None:
        process_next_tryon_job(block_seconds=poll)

    @staticmethod
    def _is_idle_timeout(exc: BaseException) -> bool:
        from redis.exceptions import TimeoutError as RedisTimeoutError

        return isinstance(exc, (RedisTimeoutError, TimeoutError))
