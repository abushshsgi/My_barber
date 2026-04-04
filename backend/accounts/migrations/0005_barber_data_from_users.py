# User jadvalidagi barber rollari va bog‘langan yozuvlardan Barber jadvalini to‘ldirish.

from django.db import migrations


def forwards(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    Barber = apps.get_model("barbers", "Barber")
    BarberProfile = apps.get_model("barbers", "BarberProfile")
    BarberApplication = apps.get_model("accounts", "BarberApplication")
    Salon = apps.get_model("salons", "Salon")
    SalonMembership = apps.get_model("salons", "SalonMembership")
    Service = apps.get_model("salons", "Service")
    Booking = apps.get_model("bookings", "Booking")
    Review = apps.get_model("bookings", "Review")
    Notification = apps.get_model("notifications", "Notification")

    need_user_ids = set()
    for s in Salon.objects.all():
        if s.owner_id:
            need_user_ids.add(s.owner_id)
    for m in SalonMembership.objects.all():
        if m.user_id:
            need_user_ids.add(m.user_id)
    for app in BarberApplication.objects.all():
        if app.user_id:
            need_user_ids.add(app.user_id)
    for prof in BarberProfile.objects.all():
        if prof.user_id:
            need_user_ids.add(prof.user_id)
    for bk in Booking.objects.all():
        if bk.barber_id:
            need_user_ids.add(bk.barber_id)
    for rv in Review.objects.all():
        if rv.barber_id:
            need_user_ids.add(rv.barber_id)
    for sv in Service.objects.all():
        if sv.barber_id:
            need_user_ids.add(sv.barber_id)

    uid_to_bid = {}
    for u in User.objects.filter(pk__in=need_user_ids):
        b, _ = Barber.objects.update_or_create(
            email=u.email,
            defaults={
                "username": u.email,
                "password": u.password,
                "full_name": u.full_name or "",
                "phone": u.phone,
                "region": getattr(u, "region", "") or "",
                "is_active": u.is_active,
            },
        )
        if u.avatar:
            b.avatar = u.avatar
            b.save(update_fields=["avatar"])
        uid_to_bid[u.pk] = b.pk

    for s in Salon.objects.exclude(owner_id=None):
        bid = uid_to_bid.get(s.owner_id)
        if bid:
            s.owner_barber_id = bid
            s.save(update_fields=["owner_barber_id"])

    for m in SalonMembership.objects.exclude(user_id=None):
        bid = uid_to_bid.get(m.user_id)
        if bid:
            m.barber_id = bid
            m.save(update_fields=["barber_id"])

    for sv in Service.objects.exclude(barber_id=None):
        bid = uid_to_bid.get(sv.barber_id)
        if bid:
            sv.barber_id = bid
            sv.save(update_fields=["barber_id"])

    for bk in Booking.objects.exclude(barber_id=None):
        bid = uid_to_bid.get(bk.barber_id)
        if bid:
            bk.barber_id = bid
            bk.save(update_fields=["barber_id"])

    for rv in Review.objects.exclude(barber_id=None):
        bid = uid_to_bid.get(rv.barber_id)
        if bid:
            rv.barber_id = bid
            rv.save(update_fields=["barber_id"])

    for app in BarberApplication.objects.exclude(user_id=None):
        bid = uid_to_bid.get(app.user_id)
        if bid:
            app.barber_id = bid
            app.save(update_fields=["barber_id"])

    for prof in BarberProfile.objects.exclude(user_id=None):
        bid = uid_to_bid.get(prof.user_id)
        if bid:
            prof.barber_id = bid
            prof.save(update_fields=["barber_id"])

    for n in Notification.objects.exclude(user_id=None):
        bid = uid_to_bid.get(n.user_id)
        if bid:
            n.barber_id = bid
            n.user_id = None
            n.save(update_fields=["barber_id", "user_id"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_barberapplication_barber_and_more"),
        ("barbers", "0004_barberprofile_barber_alter_barberprofile_user"),
        ("bookings", "0003_alter_booking_barber_alter_review_barber"),
        ("notifications", "0002_notification_barber_alter_notification_user"),
        ("salons", "0004_alter_salonmembership_unique_together_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards, noop_reverse),
    ]
