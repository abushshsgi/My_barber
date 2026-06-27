from django.db import migrations
from django.db.models import F


def owner_services_to_catalog(apps, schema_editor):
    """Salon egasiga bog‘langan xizmatlarni salon katalogiga (barber=null) ko‘chiradi.

    Avval salon xizmatlari va egasining mustaqil xizmatlari bitta `barber=owner`
    qatorida birlashib ketardi. Endi salon katalogi `barber=null` bilan
    belgilanadi, shu sababli mavjud egasi qatorlarini katalogga aylantiramiz.
    """
    Service = apps.get_model("salons", "Service")
    Service.objects.filter(barber_id=F("salon__owner_barber_id")).update(barber=None)


class Migration(migrations.Migration):

    dependencies = [
        ("salons", "0009_amenity_models"),
    ]

    operations = [
        migrations.RunPython(owner_services_to_catalog, migrations.RunPython.noop),
    ]
