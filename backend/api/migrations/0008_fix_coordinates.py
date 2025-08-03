from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('api', '0006_hospitalrequest'),  # Use your latest migration number
    ]

    operations = [
        migrations.AlterField(
            model_name='hospitalrequest',
            name='patient_latitude',
            field=models.DecimalField(decimal_places=12, help_text="Patient's location when request was made", max_digits=15),
        ),
        migrations.AlterField(
            model_name='hospitalrequest',
            name='patient_longitude',
            field=models.DecimalField(decimal_places=12, help_text="Patient's location when request was made", max_digits=15),
        ),
    ]