# Contributing to MotoPreview

Gracias por contribuir a MotoPreview. Este documento establece las reglas básicas para colaborar en el proyecto.

## Ramas

- `main`: rama principal, siempre estable y desplegable.
- `feature/<nombre>`: nuevas funcionalidades (ej. `feature/exportar-reportes`).
- `fix/<nombre>`: corrección de errores (ej. `fix/error-login`).
- `docs/<nombre>`: cambios de documentación.
- `refactor/<nombre>`: refactorización sin cambio de comportamiento.

Reglas:

- No hacer commits directos a `main`. Todo cambio debe integrarse mediante Pull Request.
- Crear la rama a partir de la última versión de `main` (`git checkout main && git pull`).
- Una rama = un cambio lógico. Evitar mezclar features y fixes en la misma rama.
- Eliminar la rama tras el merge.

## Convención de commits

Se usa [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>: <descripción corta en imperativo>
```

Tipos permitidos:

- `feat`: nueva funcionalidad.
- `fix`: corrección de error.
- `refactor`: refactorización.
- `docs`: documentación.
- `test`: pruebas.
- `chore`: tareas de mantenimiento.
- `style`: cambios de formato/estilo (sin lógica).
- `perf`: mejoras de rendimiento.

Ejemplos válidos:

- `feat: agregar filtro por fecha`
- `fix: corregir validación de correo`
- `refactor: eliminar código duplicado en usuarios`

No se aceptan mensajes genéricos como `cambios`, `final`, `arreglo`, `ahora-si`.

## Proceso de Pull Request

1. Crear la rama y realizar los cambios.
2. Ejecutar las pruebas (`npm run test` en frontend, `manage.py test` en backend) y el linter (`npm run lint`).
3. Abrir un Pull Request hacia `main` con:
   - Título descriptivo.
   - Descripción del cambio.
   - Issue relacionado (`Closes #N`).
   - Instrucciones para verificarlo.
   - Evidencia (capturas) cuando sea necesario.
4. Esperar revisión y resolver comentarios.
5. Hacer merge (preferentemente squash) y eliminar la rama.

## Reglas básicas de contribución

- Mantener el estilo y convenciones del código existente.
- No incluir credenciales ni secretos en el código; usar variables de entorno.
- Actualizar la documentación cuando se agregue o cambie funcionalidad.
- Agregar o actualizar pruebas para los cambios realizados.
- Mantener el backend en el puerto 8001 (el 8000 está ocupado por BrasaGo/WSL).
- No subir archivos generados (`node_modules`, `venv`, `__pycache__`, `.env`).
