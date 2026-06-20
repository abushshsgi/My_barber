from django.test import TestCase

from accounts.models import User
from accounts.serializers import UserSerializer


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
