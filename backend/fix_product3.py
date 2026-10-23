with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find and fix the Product line
for i, line in enumerate(lines):
    if "Product,  # Admin personalizado" in line:
        lines[i] = "    (Product, ProductAdmin),  # Admin personalizado para l�gica condicional\n"
        print(f"Fixed line {i+1}")
        break

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\admin.py", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Done!")