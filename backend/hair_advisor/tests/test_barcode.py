from django.test import SimpleTestCase

from hair_advisor.services.barcode import validate_barcode_checksum


class BarcodeChecksumTests(SimpleTestCase):
    def test_valid_ean13(self):
        valid, code = validate_barcode_checksum("4006381333931")
        self.assertTrue(valid)
        self.assertEqual(code, "4006381333931")

    def test_invalid_checksum(self):
        valid, _ = validate_barcode_checksum("5901234123450")
        self.assertFalse(valid)

    def test_short_code(self):
        valid, _ = validate_barcode_checksum("123")
        self.assertFalse(valid)