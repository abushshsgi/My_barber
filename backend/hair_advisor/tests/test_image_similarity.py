from django.test import SimpleTestCase

from hair_advisor.services.image_similarity import average_hash, image_similarity_score


class ImageSimilarityTests(SimpleTestCase):
    def test_identical_hashes_score_one(self):
        # 2x2 grayscale PNG-ish bytes via minimal valid PNG not needed — use raw RGB create
        from PIL import Image
        import io

        img = Image.new("L", (16, 16), color=128)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        h1 = average_hash(buf.getvalue())
        h2 = average_hash(buf.getvalue())
        self.assertIsNotNone(h1)
        self.assertEqual(image_similarity_score(h1, h2), 1.0)

    def test_different_images_lower_score(self):
        from PIL import Image
        import io

        a = io.BytesIO()
        Image.new("L", (32, 32), color=0).save(a, format="PNG")
        b = io.BytesIO()
        img = Image.new("L", (32, 32), color=128)
        for x in range(32):
            for y in range(32):
                if (x + y) % 2:
                    img.putpixel((x, y), 255)
        b = io.BytesIO()
        img.save(b, format="PNG")
        h1, h2 = average_hash(a.getvalue()), average_hash(b.getvalue())
        self.assertNotEqual(h1, h2)
        self.assertLess(image_similarity_score(h1, h2), 0.85)