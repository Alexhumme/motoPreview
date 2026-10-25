import os
import re

os.chdir(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\frontend\src')

for root, dirs, files in os.walk('.'):
    for fname in files:
        if fname.endswith('.jsx') or fname.endswith('.js'):
            path = os.path.join(root, fname)
            with open(os.path.join(root, fname), 'r', encoding='utf-8') as f:
                content = f.read()
            if 'roles' in content or 'AuthContext' in content or 'ModalConfirmacion' in content or 'services' in content or 'context' in line:
                rel_path = os.path.relpath(os.path.join(root, fname), '.')
                for i, line in enumerate(content.split('\n'), 1):
                    if any(kw in line for kw in ['roles', 'AuthContext', 'ModalConfirmacion', 'services', 'context']):
                        if 'import' in line or 'from' in line:
                            print(f'{os.path.relpath(os.path.join(root, fname), ".")}: {line.strip()}')

print("Done!")