import os
import re

os.chdir(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\frontend\src')

replacements = [
    (r'\.\./\.\./forms/ModalConfirmacion', '../forms/ModalConfirmacion'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./services/', '../services/'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    (r'\.\./\.\./services/', '../services/'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    (r'\.\./\.\./services/inventario', '../services/inventario'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./utils/constants/roles', '../../utils/constants/roles'),
]

for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            path = os.path.join(root, f)
            with open(os.path.join(root, f), 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            for old, new in replacements:
                content = content.replace(old, new)
            if content != original:
                with open(os.path.join(root, f), 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Fixed: {os.path.relpath(os.path.join(root, f), ".")}')