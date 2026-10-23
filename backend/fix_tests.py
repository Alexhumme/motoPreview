with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\test_endpoints.py", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")
new_lines = []
for i, line in enumerate(lines):
    new_lines.append(line)
    if "class " in line and "SimpleTestCase" in line:
        indent = len(line) - len(line.lstrip())
        new_lines.append(" " * indent + "    databases = [\"default\"]")

with open(r"C:\Users\elkin aguas\Documents\Proyectos\motoPreview\backend\api\test_endpoints.py", "w", encoding="utf-8") as f:
    f.write("\n".join(new_lines))

print("Updated test classes")