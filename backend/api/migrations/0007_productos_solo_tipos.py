import uuid

import django.utils.timezone
from django.db import migrations, models


_CREAR_TABLAS = """
CREATE TABLE IF NOT EXISTS marca (
    id_marca UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    logo TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS tipo_producto (
    id_tipo_producto UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    accesorio BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS producto_tipo_producto (
    id BIGSERIAL PRIMARY KEY,
    id_producto UUID NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
    id_tipo_producto UUID NOT NULL REFERENCES tipo_producto(id_tipo_producto) ON DELETE CASCADE,
    UNIQUE (id_producto, id_tipo_producto)
);
ALTER TABLE producto_tipo_producto ADD COLUMN IF NOT EXISTS id BIGSERIAL;
CREATE UNIQUE INDEX IF NOT EXISTS producto_tipo_producto_id_unico ON producto_tipo_producto (id);
"""


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0006_alter_recursoaccion_options"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[migrations.RunSQL(_CREAR_TABLAS, reverse_sql="""
                DROP TABLE IF EXISTS producto_tipo_producto;
                DROP TABLE IF EXISTS tipo_producto;
                DROP TABLE IF EXISTS marca;
            """)],
            state_operations=[
                migrations.CreateModel(
                    name="Marca",
                    fields=[
                        ("id_marca", models.UUIDField(db_column="id_marca", default=uuid.uuid4, primary_key=True, serialize=False)),
                        ("nombre", models.CharField(max_length=100)),
                        ("logo", models.TextField(blank=True, null=True)),
                        ("activo", models.BooleanField(default=True)),
                        ("creado_en", models.DateTimeField(blank=True, default=django.utils.timezone.now, null=True)),
                    ],
                    options={"db_table": "marca", "ordering": ["nombre"], "abstract": False, "managed": True},
                ),
                migrations.CreateModel(
                    name="TipoProducto",
                    fields=[
                        ("id_tipo_producto", models.UUIDField(db_column="id_tipo_producto", default=uuid.uuid4, primary_key=True, serialize=False)),
                        ("nombre", models.CharField(max_length=100)),
                        ("descripcion", models.TextField(blank=True, null=True)),
                        ("accesorio", models.BooleanField(default=False)),
                        ("activo", models.BooleanField(default=True)),
                        ("creado_en", models.DateTimeField(blank=True, default=django.utils.timezone.now, null=True)),
                    ],
                    options={"db_table": "tipo_producto", "ordering": ["nombre"], "abstract": False, "managed": True},
                ),
                migrations.CreateModel(
                    name="ProductoTipoProducto",
                    fields=[
                        ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                        ("producto", models.ForeignKey(db_column="id_producto", on_delete=models.CASCADE, related_name="producto_tipos", to="api.product")),
                        ("tipo", models.ForeignKey(db_column="id_tipo_producto", on_delete=models.CASCADE, related_name="producto_tipos", to="api.tipoproducto")),
                    ],
                    options={"db_table": "producto_tipo_producto", "abstract": False, "managed": True, "unique_together": {("producto", "tipo")}},
                ),
                migrations.DeleteModel(name="ProductCategory"),
            ],
        ),
    ]
