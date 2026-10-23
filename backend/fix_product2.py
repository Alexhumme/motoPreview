with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "r", encoding="utf-8") as f:
    content = f.read()

# Fix the Product entry - replace bare Product with tuple
content = content.replace(
    "    Product,  # Admin personalizado para l�gica condicional",
    "    (Product, ProductAdmin),  # Admin personalizado para l�gica condicional"
)

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed!")