# Fix: Create custom ProductAdmin with conditional fields for accessory
# This script adds a custom ProductAdmin class to admin.py

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find the location to insert the new class (before the registration loop)
# We'll add it after the AccessoryTokenAdmin class
insert_marker = "admin_site.register(AccessoryToken, AccessoryTokenAdmin)"

new_class = '''

class ProductAdmin(BaseAdmin):
    list_display = ("id_producto", "nombre", "es_accesorio", "categoria_producto", "precio")
    list_filter = ("es_accesorio", "categoria_producto")
    search_fields = ("nombre", "codigo_sku")
    readonly_fields = ("id_producto",)
    
    fieldsets = (
        ("Información básica", {
            "fields": ("nombre", "descripcion", "estado", "categoria_producto", "imagen", "codigo_sku", "precio")
        }),
        ("Configuración de accesorio", {
            "fields": ("es_accesorio", "categoria_accesorio", "tipo_accesorio"),
            "description": "Solo aplicar si el producto es un accesorio",
            "classes": ("collapse",),
        }),
    )

    def get_fieldsets(self, request, obj=None):
        """Mostrar/ocultar campos de accesorio según es_accesorio"""
        fieldsets = super().get_fieldsets(request, obj)
        if obj and not obj.es_accesorio:
            # Si NO es accesorio, ocultar la sección de configuración de accesorio
            return [fs for fs in fieldsets if fs[0] != "Configuración de accesorio"]
        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        """Hacer campos de accesorio no requeridos y añadir ayuda"""
        form = super().get_form(request, obj, **kwargs)
        if "categoria_accesorio" in form.base_fields:
            form.base_fields["categoria_accesorio"].required = False
            form.base_fields["categoria_accesorio"].help_text = "Solo requerido si es_accesorio=True"
        if "tipo_accesorio" in form.base_fields:
            form.base_fields["tipo_accesorio"].required = False
            form.base_fields["tipo_accesorio"].help_text = "Solo requerido si es_accesorio=True"
        return form

'''

# Insert the new class before the registration loop
insert_point = content.find("for model in (")
if insert_point == -1:
    print("ERROR: Could not find insertion point")
else:
    # Find the line before the loop
    insert_point = content.rfind("\n\n", 0, insert_point)
    if insert_point == -1:
        insert_point = 0
    
    new_content = content[:insert_point] + "\n\n" + new_class + content[insert_point:]
    
    # Also update the registration to use ProductAdmin instead of BaseAdmin
    new_content = new_content.replace(
        "    Product,",
        "    (Product, ProductAdmin),"
    )
    
    with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print("ProductAdmin added and registered!")