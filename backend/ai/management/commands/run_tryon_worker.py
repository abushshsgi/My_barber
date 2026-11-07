"""Redis navbat — try-on worker (thread pool; global provider slotlar bilan)."""

from __future__ import annotations

import logging
import time
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait

from django.conf import settings
from django.core.management.base import BaseCommand

from ai.services.tryon_queue import (
    _redis_client,
    is_queue_enabled,
    mark_worker_heartbeat,
    process_next_tryon_job,
    recover_abandoned_jobs,
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Try-on Redis navbatini tinglaydi va Runware generatsiyani bajaradi."

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
        configured = int(getattr(settings, "TRYON_WORKER_CONCURRENCY", 4) or 4)
        raw = options["concurrency"]
        concurrency = max(1, min(int(raw if raw is not None else configured), 8))
        slots = int(getattr(settings, "TRYON_PROVIDER_CONCURRENCY", 3) or 3)
        model = getattr(settings, "RUNWARE_TRYON_MODEL", "runware:400@2")
        self.stdout.write(
            f"Try-on worker ishga tushdi (provider=runware, model={model}, "
            f"poll={poll}s, threads={concurrency}, global_provider_slots={slots})..."
        )
        self._recover()

        if concurrency == 1:
            self._run_serial(poll)
            return
        self._run_pool(poll, concurrency)

    def _recover(self) -> None:
        client = _redis_client()
        if client is None:
            return
        try:
            n = recover_abandoned_jobs(client)
            if n:
                self.stdout.write(f"Abandoned/missing jobs recovered: {n}")
        except Exception as exc:
            logger.exception("Try-on recovery error: %s", exc)

    def _run_serial(self, poll: int) -> None:
        loops = 0
        while True:
            try:
                loops += 1
                if loops % 6 == 0:
                    self._recover()
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
        loops = 0
        with ThreadPoolExecutor(max_workers=concurrency, thread_name_prefix="tryon") as pool:
            try:
                while True:
                    loops += 1
                    if loops % 12 == 0:
                        pool.submit(self._recover)
                    client = _redis_client()
                    if client is not None:
                        mark_worker_heartbeat(client)
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
