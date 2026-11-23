# Issue BUG-01: Validación incorrecta de correo en formularios

## Descripción
El formulario de registro y recuperación de contraseña no validan correctamente el formato del correo electrónico. Se aceptan correos inválidos que no tienen la estructura `@dominio.tld`, lo que puede causar errores en el envío de emails y problemas de seguridad.

## Problema
- El backend y frontend tienen validación mínima o nula para el formato de email
- Se aceptan entradas como "usuario@", "@dominio.com", o texto plano sin @
- Esto provoca fallos silenciosos en el envío de emails de verificación y recuperación

## Pasos para reproducir
1. Acceder al formulario de registro en http://localhost:5173/registro
2. Ingresar un correo electrónico con formato inválido (ej. "usuario@")
3. Intentar enviar el formulario
4. El formulario permite el envío sin mostrar error de validación

## Prioridad
Alta

## Responsable
Equipo de desarrollo

## Criterio de solución considerado solucionado
- El frontend valida el formato de email antes de enviar al backend (patrón: `^[^\s@]+@[^\s@]+\.[^\s@]+$`)
- El backend también valida el formato de email en el serializer
- Se muestra un mensaje de error claro al usuario cuando el formato es inválido
- Los tests unitarios validan que correos inválidos son rechazados

## Issue relacionado
Closes #01
