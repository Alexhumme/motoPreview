with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "r", encoding="utf-8") as f:
    content = f.read()

# Remove all old tuples with (Product, ProductAdmin) in import and SPANISH_NAMES sections
# They should be just Product

content = content.replace("(Product, ProductAdmin),", "Product,")

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Removed old tuples!")