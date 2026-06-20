from django.test import TestCase
from rest_framework.exceptions import ValidationError

from accounts.models import User
from accounts.name_validation import is_display_name_taken, validate_display_name
from accounts.serializers import UserSerializer
from barbers.models import Barber


class DisplayNameValidationTests(TestCase):
    def test_requires_first_and_last(self):
        with self.assertRaises(ValidationError):
            validate_display_name("Ali")

    def test_rejects_digits_and_symbols(self):
        with self.assertRaises(ValidationError):
            validate_display_name("Ali Valiev1")
        with self.assertRaises(ValidationError):
            validate_display_name("Ali@Valiev")

    def test_rejects_short_parts(self):
        with self.assertRaises(ValidationError):
            validate_display_name("A Li")

    def test_accepts_uzbek_apostrophe(self):
        normalized = validate_display_name("Abdulloh O'rinboyev")
        self.assertEqual(normalized, "Abdulloh O'rinboyev")

    def test_rejects_taken_user_name(self):
        User.objects.create(
            email="taken@phone.mysaloon.local",
            username="taken@phone.mysaloon.local",
            full_name="Ali Valiyev",
            first_name="Ali",
            last_name="Valiyev",
        )
        self.assertTrue(is_display_name_taken("Ali Valiyev"))
        self.assertTrue(is_display_name_taken("ali valiyev"))

    def test_rejects_taken_barber_name(self):
        Barber.objects.create(
            email="barber@test.com",
            username="barber@test.com",
            full_name="Sardor Karimov",
        )
        with self.assertRaises(ValidationError):
            validate_display_name("Sardor Karimov")

    def test_allows_same_name_for_current_user(self):
        user = User.objects.create(
            email="me@phone.mysaloon.local",
            username="me@phone.mysaloon.local",
            full_name="Ali Valiyev",
            first_name="Ali",
            last_name="Valiyev",
        )
        self.assertFalse(is_display_name_taken("Ali Valiyev", exclude_user_id=user.pk))
        validate_display_name("Ali Valiyev", exclude_user_id=user.pk)


class UserProfilePatchTests(TestCase):
    def test_full_name_patch_persists_to_db(self):
        user = User.objects.create(
            email="998901234567@phone.mysaloon.local",
            username="998901234567@phone.mysaloon.local",
            phone="+998901234567",
            role=User.Role.USER,
            full_name="Eski Ism",
            first_name="Eski",
            last_name="Ism",
        )
        ser = UserSerializer(user, data={"full_name": "Yangi Ism Familiya"}, partial=True)
        self.assertTrue(ser.is_valid(), ser.errors)
        ser.save()
        user.refresh_from_db()
        self.assertEqual(user.full_name, "Yangi Ism Familiya")
        self.assertEqual(user.first_name, "Yangi")
        self.assertEqual(user.last_name, "Ism Familiya")

    def test_full_name_patch_rejects_taken_name(self):
        User.objects.create(
            email="other@phone.mysaloon.local",
            username="other@phone.mysaloon.local",
            full_name="Band Ism",
            first_name="Band",
            last_name="Ism",
        )
        user = User.objects.create(
            email="998901234568@phone.mysaloon.local",
            username="998901234568@phone.mysaloon.local",
            full_name="Eski Ism",
            first_name="Eski",
            last_name="Ism",
        )
        ser = UserSerializer(user, data={"full_name": "Band Ism"}, partial=True)
        self.assertFalse(ser.is_valid())
        self.assertIn("full_name", ser.errors)
