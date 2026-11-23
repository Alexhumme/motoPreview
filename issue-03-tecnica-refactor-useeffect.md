# Issue Técnica-03: Refactorizar useEffect duplicados en componentes frontend

## Descripción
Varios componentes frontend repiten el patrón `useEffect` + `useRef` guard + fetch + setState para cargar datos iniciales. Este patrón se repite en: Accesorios, Inventario, Usuarios, Tienda, Tiendas, ResumenTienda, Cotizaciones, Dashboard, Reportes, Seguridad.

## Problema
- Código duplicado en 10+ componentes con el mismo patrón de carga inicial
- Dificulta mantener y actualizar la lógica de carga
- Riesgo de inconsistencias entre componentes
- Violación del principio DRY (Don't Repeat Yourself)

## Solución propuesta
- Crear un hook personalizado `useCargaInicial` que encapsule el patrón `useEffect` + `useRef` guard + fetch + setState
- Refactorizar cada componente para usar el nuevo hook
- El hook debe soportar: URL de API, opciones de inicialización, callback de éxito y error
- Documentar el hook con ejemplos de uso

## Prioridad
Media

## Responsable
Equipo de frontend

## Criterio de solución considerado solucionado
- Se crea el hook `useCargaInicial` en `frontend/src/utils/useCargaInicial.ts`
- Al menos 5 componentes refactorizados para usar el nuevo hook
- El patrón duplicado ha sido eliminado de los componentes refactorizados
- Los tests existentes siguen pasando
- Se actualiza la documentación del hook

## Issue relacionado
Closes #03
