from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0007_productos_solo_tipos"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    """
                    ALTER TABLE detalle_cotizacion
                        ADD COLUMN IF NOT EXISTS id_producto UUID
                        REFERENCES producto(id_producto) ON DELETE SET NULL;
                    """,
                    reverse_sql="",
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name="quotedetail",
                    name="producto",
                    field=models.ForeignKey(
                        blank=True,
                        db_column="id_producto",
                        null=True,
                        on_delete=models.SET_NULL,
                        related_name="detalles_cotizacion",
                        to="api.product",
                    ),
                ),
            ],
        ),
    ]
