import os
import re

os.chdir(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\frontend\src')

replacements = [
    # Fix ModalConfirmacion imports
    (r'\.\./\.\./forms/ModalConfirmacion', '../forms/ModalConfirmacion'),
    
    # Fix AuthContext imports
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    
    # Fix services imports
    (r'\.\./\.\./services/', '../services/'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    (r'\.\./\.\./services/inventario', '../services/inventario'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    
    # Fix context imports
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    
    # Fix utils/constants/roles imports
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    (r'\.\./\.\./utils/constants/roles', '../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    
    # Fix services imports
    (r'\.\./\.\./services/', '../services/'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    (r'\.\./\.\./services/inventario', '../services/inventario'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    
    # Fix context imports
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    
    # Fix utils/constants/roles imports
    (r'\.\./\.\./utils/constants/roles', '../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    (r'\.\./\.\./utils/constants/roles', '../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
    
    # Fix services imports
    (r'\.\./\.\./services/', '../services/'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    (r'\.\./\.\./services/inventario', '../services/inventario'),
    (r'\.\./\.\./services/cotizaciones', '../services/cotizaciones'),
    
    # Fix context imports
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    (r'\.\./\.\./context/AuthContext', '../context/AuthContext'),
    
    # Fix utils/constants/roles imports
    (r'\.\./\.\./utils/constants/roles', '../../utils/constants/roles'),
    (r'\.\./\.\./\.\./utils/constants/roles', '../../../utils/constants/roles'),
]

for root, dirs, files in os.walk('.'):
    for fname in files:
        if fname.endswith('.jsx') or fname.endswith('.js'):
            path = os.path.join(root, fname)
            with open(os.path.join(root, fname), 'r', encoding='utf-8') as f:
                content = f.read()
            original = content
            for old, new in replacements:
                content = content.replace(old, new)
            if content != original:
                with open(os.path.join(root, fname), 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Fixed: {os.path.relpath(os.path.join(root, fname), ".")}')

print("Done!")