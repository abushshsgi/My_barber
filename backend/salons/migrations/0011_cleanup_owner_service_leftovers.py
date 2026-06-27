from django.db import migrations
from django.db.models import F


def cleanup_owner_service_leftovers(apps, schema_editor):
    """Eski owner-sync qoldiqlarini katalogga aylantirish yoki dublikatni o'chirish."""
    Service = apps.get_model("salons", "Service")

    stale = Service.objects.filter(
        barber_id=F("salon__owner_barber_id"),
        salon__owner_barber_id__isnull=False,
    )

    for svc in stale.iterator():
        dup_q = Service.objects.filter(salon_id=svc.salon_id, barber__isnull=True).exclude(pk=svc.pk)
        if svc.catalog_service_id:
            dup_q = dup_q.filter(catalog_service_id=svc.catalog_service_id)
        else:
            dup_q = dup_q.filter(name=svc.name, catalog_service__isnull=True)

        if dup_q.exists():
            svc.delete()
        else:
            Service.objects.filter(pk=svc.pk).update(barber=None)

    Service.objects.filter(
        barber_id=F("salon__owner_barber_id"),
        is_active=False,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("salons", "0010_owner_services_to_catalog"),
    ]

    operations = [
        migrations.RunPython(cleanup_owner_service_leftovers, migrations.RunPython.noop),
    ]
