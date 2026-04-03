from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from notifications.utils import notify_user

from .models import Salon


@receiver(pre_save, sender=Salon)
def salon_store_old_published(sender, instance, **kwargs):
    if not instance.pk:
        instance._was_published = None
        return
    try:
        prev = Salon.objects.only("is_published").get(pk=instance.pk)
        instance._was_published = prev.is_published
    except Salon.DoesNotExist:
        instance._was_published = None


@receiver(post_save, sender=Salon)
def salon_notify_when_published(sender, instance, created, **kwargs):
    if created:
        return
    was = getattr(instance, "_was_published", None)
    if was is False and instance.is_published:
        notify_user(
            instance.owner,
            "salon_approved",
            "MyBarber: salon tasdiqlandi",
            f'"{instance.name}" admin tomonidan tasdiqlandi va endi mijozlarga ko‘rinadi.',
            send_email=True,
        )
