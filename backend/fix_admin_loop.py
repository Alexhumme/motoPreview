with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the registration loop to handle tuples (model, admin_class)
old_loop = """for model in (
    AccessoryCategory,
    ProductCategory,
    AccessoryType,
    (Product, ProductAdmin),
    MotorcycleBrand,
    MotorcycleModel,
    Motorcycle,
    AccessoryCompatibility,
    Model3D,
    SubscriptionPlan,
    Inventory,
    MovementType,
    InventoryMovement,
    Quote,
    QuoteDetail,
    QuoteStatusHistory,
    Configuration,
    ConfigurationDetail,
):
    try:
        admin_site.register(model, BaseAdmin)
    except admin.sites.AlreadyRegistered:
        pass"""

new_loop = """# Registro de modelos con admin personalizado
admin_models = [
    (AccessoryCategory, BaseAdmin),
    (ProductCategory, BaseAdmin),
    (AccessoryType, BaseAdmin),
    (Product, ProductAdmin),  # Admin personalizado para lógica condicional
    (MotorcycleBrand, BaseAdmin),
    (MotorcycleModel, BaseAdmin),
    (Motorcycle, BaseAdmin),
    (AccessoryCompatibility, BaseAdmin),
    (Model3D, BaseAdmin),
    (SubscriptionPlan, BaseAdmin),
    (Inventory, BaseAdmin),
    (MovementType, BaseAdmin),
    (InventoryMovement, BaseAdmin),
    (Quote, BaseAdmin),
    (QuoteDetail, BaseAdmin),
    (QuoteStatusHistory, BaseAdmin),
    (Configuration, BaseAdmin),
    (ConfigurationDetail, BaseAdmin),
]

for model, admin_class in admin_models:
    try:
        admin_site.register(model, admin_class)
    except admin.sites.AlreadyRegistered:
        pass"""

if old_loop in content:
    content = content.replace(old_loop, new_loop)
    with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed registration loop!")
else:
    print("Old loop not found")
    # Show what's there
    idx = content.find("for model in (")
    if idx >= 0:
        print(content[idx:idx+500])