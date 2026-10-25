import os

os.chdir(r'C:\Users\elkin aguas\Documents\Proyectos\motoPreview\frontend\src')

for root, dirs, files in os.walk('.'):
    for fname in files:
        if fname.endswith('.jsx') or fname.endswith('.js'):
            path = os.path.join(root, fname)
            with open(os.path.join(root, fname), 'r', encoding='utf-8') as f:
                content = f.read()
            for i, line in enumerate(content.split('\n'), 1):
                if 'import' in line or 'from' in line:
                    if any(kw in line for kw in ['roles', 'AuthContext', 'ModalConfirmacion', 'services', 'context']):
                        rel_path = os.path.relpath(os.path.join(root, fname), '.')
                        print(f'{rel_path}:{i+1}: {line.strip()}')

print("Done!")