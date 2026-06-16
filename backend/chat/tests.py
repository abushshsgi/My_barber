from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from barbers.models import Barber
from bookings.models import Booking
from chat.models import Conversation
from salons.models import Salon, SalonMembership

User = get_user_model()


def _token(user) -> str:
    return str(RefreshToken.for_user(user).access_token)


class ChatApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="901777888@phone.mysaloon.local",
            email="901777888@phone.mysaloon.local",
            phone="+998901777888",
            password="unused",
        )
        self.barber = Barber.objects.create(
            email="chat-barber@test.uz",
            username="chat-barber@test.uz",
            full_name="Chat Barber",
            is_active=True,
        )
        self.barber.set_password("unused")
        self.barber.save()
        self.salon = Salon.objects.create(
            name="Chat Salon",
            latitude="41.2995",
            longitude="69.2401",
            is_published=True,
        )
        SalonMembership.objects.create(
            salon=self.salon,
            barber=self.barber,
            role=SalonMembership.Role.WORKER,
            invite_state=SalonMembership.InviteState.ACTIVE,
        )
        start = timezone.now() + timedelta(days=1)
        Booking.objects.create(
            customer=self.user,
            salon=self.salon,
            barber=self.barber,
            start_at=start,
            end_at=start + timedelta(hours=1),
            status=Booking.Status.ACCEPTED,
        )
        Conversation.objects.create(user=self.user, barber=self.barber)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {_token(self.user)}")

    def test_conversations_list_for_customer(self):
        res = self.client.get("/api/v1/chat/conversations/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)
