with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\models.py", "r", encoding="utf-8") as f:
    content = f.read()

changes = [
    # URL fields
    ('imagen = models.TextField(null=True, blank=True)', 'imagen = models.URLField(null=True, blank=True)'),
    ('moto_imagen = models.TextField(null=True, blank=True)', 'moto_imagen = models.URLField(null=True, blank=True)'),
    
    # Code/SKU fields
    ('codigo_sku = models.TextField(null=True, blank=True, unique=True)', 'codigo_sku = models.CharField(max_length=100, null=True, blank=True, unique=True)'),
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