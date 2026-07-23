"""Barber ro'yxatdan o'tganda MySaloon hisob + QR profil yaratish."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from barbers.models import Barber


@receiver(post_save, sender=Barber)
def ensure_barber_mysaloon_account(sender, instance: Barber, created: bool, **kwargs):
    if not created:
        return
    try:
        from wallet.services.barber_wallet import BarberWalletService
        from wallet.services.qr_pay import QrPayService

        BarberWalletService.ensure_wallet(instance, seed_legacy=False)
        QrPayService.ensure_profile(instance)
    except Exception:
        # Signup buzilmasin — keyinroq ensure_wallet chaqiriladi
        pass
