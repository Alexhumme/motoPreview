with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\models.py", "r", encoding="utf-8") as f:
    content = f.read()

changes = [
    ('cat_nombre = models.TextField()', 'cat_nombre = models.CharField(max_length=100)'),
    ('nombre = models.TextField()', 'nombre = models.CharField(max_length=100)'),
    ('marca_nombre = models.TextField()', 'marca_nombre = models.CharField(max_length=100)'),
    ('marca_pais = models.TextField(null=True, blank=True)', 'marca_pais = models.CharField(max_length=100, null=True, blank=True)'),
    ('modelo_nombre = models.TextField()', 'modelo_nombre = models.CharField(max_length=150)'),
    ('cilindraje = models.TextField(null=True, blank=True)', 'cilindraje = models.CharField(max_length=50, null=True, blank=True)'),
    ('moto_version = models.TextField(null=True, blank=True)', 'moto_version = models.CharField(max_length=100, null=True, blank=True)'),
    ('plan_nombre = models.TextField()', 'plan_nombre = models.CharField(max_length=100)'),
    ('nombre_tienda = models.TextField()', 'nombre_tienda = models.CharField(max_length=150)'),
    ('nit = models.TextField(null=True, blank=True, unique=True)', 'nit = models.CharField(max_length=50, null=True, blank=True, unique=True)'),
    ('telefono_tienda = models.TextField(null=True, blank=True)', 'telefono_tienda = models.CharField(max_length=30, null=True, blank=True)'),
    ('email_tienda = models.TextField(null=True, blank=True)', 'email_tienda = models.EmailField(max_length=254, null=True, blank=True)'),
    ('usu_nombre = models.TextField()', 'usu_nombre = models.CharField(max_length=150)'),
    ('usu_email = models.TextField(unique=True)', 'usu_email = models.EmailField(unique=True)'),
    ('nombre_configuracion = models.TextField(null=True, blank=True)', 'nombre_configuracion = models.CharField(max_length=100, null=True, blank=True)'),
    ('url_modelo3d = models.TextField()', 'url_modelo3d = models.URLField()'),
    ('formato_archivo = models.TextField(null=True, blank=True)', 'formato_archivo = models.CharField(max_length=50, null=True, blank=True)'),
    ('estado_visualizacion = models.TextField(null=True, blank=True)', 'estado_visualizacion = models.CharField(max_length=50, null=True, blank=True)'),
]

for old, new in changes:
    if old in content:
        content = content.replace(old, new)
        print(f"OK: {old[:50]} -> {new[:50]}")
    else:
        print(f"NOT FOUND: {old[:50]}")

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\models.py", "w", encoding="utf-8") as f:
    f.write(content)
print("Done!")