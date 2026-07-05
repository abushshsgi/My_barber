"""Redis navbat — try-on worker (Vertex chaqiruvlarini ketma-ket bajaradi)."""

from __future__ import annotations

import logging
import time

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

    def handle(self, *args, **options):
        if not is_queue_enabled():
            self.stderr.write("REDIS_URL yo'q yoki TRYON_QUEUE_ENABLED=false — worker to'xtatildi.")
            return

        poll = max(1, int(options["poll_seconds"]))
        self.stdout.write(f"Try-on worker ishga tushdi (poll={poll}s)...")

        while True:
            try:
                process_next_tryon_job(block_seconds=poll)
            except KeyboardInterrupt:
                self.stdout.write("Try-on worker to'xtatildi.")
                return
            except Exception as exc:
                logger.exception("Try-on worker loop error: %s", exc)
                time.sleep(2)
