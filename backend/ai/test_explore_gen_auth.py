from django.test import SimpleTestCase, override_settings

from ai.explore_gen_auth import explore_gen_is_allowed, explore_gen_request_key


class _Req:
    def __init__(self, *, headers=None, GET=None, query_params=None):
        self.headers = headers or {}
        self.GET = GET or {}
        if query_params is not None:
            self.query_params = query_params


class ExploreGenAuthTests(SimpleTestCase):
    @override_settings(DEBUG=True, EXPLORE_GEN_SECRET="prod-secret")
    def test_debug_allows_without_key(self):
        self.assertTrue(explore_gen_is_allowed(_Req()))

    @override_settings(DEBUG=False, EXPLORE_GEN_SECRET="")
    def test_prod_without_secret_denies(self):
        self.assertFalse(explore_gen_is_allowed(_Req()))

    @override_settings(DEBUG=False, EXPLORE_GEN_SECRET="prod-secret")
    def test_prod_accepts_header(self):
        req = _Req(headers={"X-Explore-Gen-Secret": "prod-secret"})
        self.assertTrue(explore_gen_is_allowed(req))

    @override_settings(DEBUG=False, EXPLORE_GEN_SECRET="prod-secret")
    def test_prod_accepts_query_params(self):
        req = _Req(query_params={"key": "prod-secret"})
        self.assertTrue(explore_gen_is_allowed(req))

    @override_settings(DEBUG=False, EXPLORE_GEN_SECRET="prod-secret")
    def test_prod_accepts_django_get(self):
        req = _Req(GET={"key": "prod-secret"})
        self.assertTrue(explore_gen_is_allowed(req))

    @override_settings(DEBUG=False, EXPLORE_GEN_SECRET="prod-secret")
    def test_prod_rejects_wrong_key(self):
        req = _Req(headers={"X-Explore-Gen-Secret": "wrong"})
        self.assertFalse(explore_gen_is_allowed(req))

    def test_header_beats_query(self):
        req = _Req(
            headers={"X-Explore-Gen-Secret": "from-header"},
            query_params={"key": "from-query"},
        )
        self.assertEqual(explore_gen_request_key(req), "from-header")
