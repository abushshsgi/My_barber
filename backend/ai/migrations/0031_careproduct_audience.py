from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ai", "0030_care_product_insights"),
    ]

    operations = [
        migrations.AddField(
            model_name="careproduct",
            name="audience",
            field=models.CharField(
                choices=[("men", "Men"), ("women", "Women"), ("unisex", "Unisex")],
                db_index=True,
                default="unisex",
                max_length=8,
            ),
        ),
    ]
