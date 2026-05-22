from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("barbers", "0014_seed_catalog_services"),
    ]

    operations = [
        migrations.AddField(
            model_name="barber",
            name="email_verification_invite_sent_at",
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                help_text="Profil sozlamalari tugaganda bir marta yuborilgan tasdiq xati vaqti.",
                null=True,
            ),
        ),
    ]
