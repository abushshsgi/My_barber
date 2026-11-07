from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from accounts.models import User


class Command(BaseCommand):
    help = "Create a test user with phone and password (no SMS required)"

    def add_arguments(self, parser):
        parser.add_argument("--phone", type=str, required=True, help="Phone number (e.g., +998901234567)")
        parser.add_argument("--password", type=str, required=True, help="Password")

    def handle(self, *args, **options):
        phone = options["phone"]
        password = options["password"]

        # Check if user already exists
        if User.objects.filter(phone=phone).exists():
            self.stdout.write(
                self.style.WARNING(f"User with phone {phone} already exists")
            )
            return

        # Create user
        user = User.objects.create(
            phone=phone,
            password=make_password(password),
            email=f"test_{phone.replace('+', '')}@mysaloon.uz",
            username=f"test_{phone.replace('+', '')}",
            full_name="Test User",
            role=User.Role.USER,
            is_active=True,
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully created test user:\nPhone: {phone}\nPassword: {password}\nEmail: {user.email}"
            )
        )
