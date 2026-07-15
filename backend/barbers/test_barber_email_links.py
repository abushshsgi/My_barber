"""Barber verification email havolasi localhostga ketmasligi."""

from __future__ import annotations

import os
from unittest import mock

from django.test import SimpleTestCase, override_settings

from barbers.barber_email import resolve_barber_web_base


class BarberEmailLinkTests(SimpleTestCase):
    @override_settings(DEBUG=False, BARBER_APP_PUBLIC_BASE="http://localhost:3003")
    def test_prod_rejects_localhost_settings_base(self):
        with mock.patch.dict(os.environ, {"FRONTEND_BARBER_ORIGIN": "http://localhost:3003"}, clear=False):
            self.assertEqual(resolve_barber_web_base(), "https://partner.mysaloon.uz")

    @override_settings(DEBUG=False, BARBER_APP_PUBLIC_BASE="http://localhost:3003")
    def test_prod_picks_public_origin_from_list(self):
        with mock.patch.dict(
            os.environ,
            {"FRONTEND_BARBER_ORIGIN": "http://localhost:3003,https://partner.mysaloon.uz"},
            clear=False,
        ):
            self.assertEqual(resolve_barber_web_base(), "https://partner.mysaloon.uz")

    @override_settings(DEBUG=False, BARBER_APP_PUBLIC_BASE="https://partner.mysaloon.uz")
    def test_prod_keeps_partner_origin(self):
        self.assertEqual(resolve_barber_web_base(), "https://partner.mysaloon.uz")
