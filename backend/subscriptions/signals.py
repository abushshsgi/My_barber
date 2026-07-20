from django.db.models.signals import post_save
from django.dispatch import receiver

from accounts.models import ReferralAttribution


@receiver(post_save, sender=ReferralAttribution)
def on_referral_attributed(sender, instance: ReferralAttribution, created: bool, **kwargs):
    if not created:
        return
    from subscriptions.services import maybe_grant_referral_trial

    maybe_grant_referral_trial(instance.referrer)
