from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory

from accounts.uz_regions import UzRegion
from geo.region_resolver import (
    is_in_uzbekistan,
    region_matches_gps,
    resolve_region_from_coords,
    _match_region_from_text,
)
from geo.services.dgis import DgisGeocoderError, GeocodeResult, geocode_query, reverse_geocode
from geo.views import GeocodeView, ReverseGeocodeView, ValidateLocationView


class RegionResolverTests(SimpleTestCase):
    def test_match_toshkent_city(self):
        self.assertEqual(_match_region_from_text("Toshkent, Navoiy ko'chasi"), UzRegion.TOSHKENT_SH)

    def test_match_buxoro(self):
        self.assertEqual(_match_region_from_text("Buxoro viloyati, Buxoro"), UzRegion.BUXORO)

    def test_uzbekistan_bbox(self):
        self.assertTrue(is_in_uzbekistan(41.31, 69.27))
        self.assertFalse(is_in_uzbekistan(51.5, -0.12))

    @patch("geo.region_resolver.reverse_geocode")
    def test_resolve_region_from_coords(self, mock_reverse):
        mock_reverse.return_value = GeocodeResult(
            lat=41.31,
            lng=69.27,
            address="Navoiy 1",
            city="Toshkent",
            full_name="Toshkent, Navoiy 1",
        )
        resolved = resolve_region_from_coords(41.31, 69.27)
        self.assertEqual(resolved.region_code, UzRegion.TOSHKENT_SH)
        self.assertTrue(resolved.in_uzbekistan)

    @patch("geo.region_resolver.reverse_geocode")
    def test_region_matches_gps(self, mock_reverse):
        mock_reverse.return_value = GeocodeResult(
            lat=41.31,
            lng=69.27,
            address="Navoiy 1",
            city="Toshkent",
            full_name="Toshkent, Navoiy 1",
        )
        self.assertTrue(region_matches_gps(UzRegion.TOSHKENT_SH, 41.31, 69.27))
        self.assertFalse(region_matches_gps(UzRegion.BUXORO, 41.31, 69.27))

    @patch("geo.region_resolver.reverse_geocode")
    def test_resolve_fallback_when_dgis_unavailable(self, mock_reverse):
        mock_reverse.return_value = None
        resolved = resolve_region_from_coords(39.77, 64.43)
        self.assertEqual(resolved.region_code, UzRegion.BUXORO)
        self.assertTrue(resolved.in_uzbekistan)


class DgisServiceTests(SimpleTestCase):
    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis.requests.get")
    def test_geocode_query_parses_result(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "meta": {"code": 200},
                "result": {
                    "items": [
                        {
                            "full_name": "Toshkent, Navoiy ko'chasi, 1",
                            "address_name": "Navoiy ko'chasi, 1",
                            "point": {"lat": 41.31, "lon": 69.27},
                        }
                    ]
                },
            },
        )
        results = geocode_query("Navoiy 1")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].lat, 41.31)
        self.assertEqual(results[0].lng, 69.27)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis.requests.get")
    def test_reverse_geocode(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "meta": {"code": 200},
                "result": {
                    "items": [
                        {
                            "full_name": "Toshkent, Navoiy ko'chasi, 1",
                            "address_name": "Navoiy ko'chasi, 1",
                            "point": {"lat": 41.31, "lon": 69.27},
                        }
                    ]
                },
            },
        )
        result = reverse_geocode(41.31, 69.27)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertIn("Navoiy", result.address)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis._reverse_geocode_dgis")
    @patch("geo.services.nominatim.reverse_geocode_nominatim")
    def test_reverse_geocode_falls_back_to_nominatim(self, mock_nominatim, mock_dgis):
        mock_dgis.side_effect = DgisGeocoderError("2GIS geocoder returned an error.")
        mock_nominatim.return_value = GeocodeResult(
            lat=39.65,
            lng=66.96,
            address="Registon ko'chasi",
            city="Samarqand",
            full_name="Samarqand, Registon ko'chasi",
        )
        result = reverse_geocode(39.65, 66.96)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.city, "Samarqand")
        mock_nominatim.assert_called_once_with(39.65, 66.96)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.services.dgis._reverse_geocode_dgis")
    @patch("geo.services.nominatim.reverse_geocode_nominatim")
    @patch("geo.services.photon.reverse_geocode_photon")
    def test_reverse_geocode_falls_back_to_photon(self, mock_photon, mock_nominatim, mock_dgis):
        mock_dgis.side_effect = DgisGeocoderError("2GIS geocoder returned an error.")
        mock_nominatim.return_value = None
        mock_photon.return_value = GeocodeResult(
            lat=41.31,
            lng=69.27,
            address="Bunyodkor Avenue",
            city="Tashkent",
            full_name="Tashkent, Bunyodkor Avenue, Uzbekistan",
        )
        result = reverse_geocode(41.31, 69.27)
        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.city, "Tashkent")
        mock_photon.assert_called_once_with(41.31, 69.27)


class GeocodeViewTests(SimpleTestCase):
    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.geocode_query")
    def test_geocode_view(self, mock_geocode):
        mock_geocode.return_value = []
        factory = APIRequestFactory()
        request = factory.get("/api/v1/geo/geocode/", {"q": "Toshkent"})
        response = GeocodeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.geocode_query")
    def test_geocode_view_dgis_error_returns_empty(self, mock_geocode):
        from geo.services.dgis import DgisGeocoderError

        mock_geocode.side_effect = DgisGeocoderError("2GIS geocoder returned an error.")
        factory = APIRequestFactory()
        request = factory.get("/api/v1/geo/geocode/", {"q": "Buxoro viloyati"})
        response = GeocodeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"], [])

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.reverse_geocode")
    def test_reverse_view(self, mock_reverse):
        from geo.services.dgis import GeocodeResult

        mock_reverse.return_value = GeocodeResult(
            lat=41.31,
            lng=69.27,
            address="Navoiy 1",
            city="Toshkent",
            full_name="Toshkent, Navoiy 1",
        )
        factory = APIRequestFactory()
        request = factory.get("/api/v1/geo/reverse/", {"lat": "41.31", "lng": "69.27"})
        response = ReverseGeocodeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["address"], "Navoiy 1")

    @override_settings(DGIS_API_KEY="test-key")
    @patch("geo.views.published_salon_count")
    @patch("geo.views.resolve_region_from_coords")
    def test_validate_view(self, mock_resolve, mock_salon_count):
        from geo.region_resolver import ResolvedLocation

        mock_resolve.return_value = ResolvedLocation(
            region_code=UzRegion.TOSHKENT_SH,
            region_label="Toshkent shahri",
            city_label="Toshkent",
            in_uzbekistan=True,
        )
        mock_salon_count.return_value = 5
        factory = APIRequestFactory()
        request = factory.get(
            "/api/v1/geo/validate/",
            {"lat": "41.31", "lng": "69.27", "region": UzRegion.TOSHKENT_SH},
        )
        response = ValidateLocationView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["matches_selected"])
        self.assertTrue(response.data["has_coverage"])
        self.assertEqual(response.data["salons_published"], 5)
