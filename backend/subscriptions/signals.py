from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import ReferralAttribution


@receiver(post_save, sender=ReferralAttribution)
def on_referral_attributed(sender, instance: ReferralAttribution, created: bool, **kwargs):
    """Referal attribution yozilganda — mukofot claim orqali beriladi (UI salyut).

    Avvalgi avto-grant o'rniga foydalanuvchi /referrals sahifasida
    «Bonusni olish» tugmasini bosadi → POST /users/me/referral/.
    """
    if not created:
        return
    # Claim-based reward — auto-grant o'chirilgan.
    return
