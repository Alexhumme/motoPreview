# Issue BUG-02: Búsqueda y selectores en la aplicación

## Descripción
La aplicación requiere funcionalidades de búsqueda en tiempo real y selectores en cascada para la selección de motocicletas, marcas, modelos y años en el configurador y catálogo.

## Problema
- Búsqueda en la tabla de usuarios no funciona sin criterio de filtrado
- Selectores en cascada (marca → modelo → año) no están implementados
- Filtro por tipo (multi-select) no disponible en catálogo y configurador
- Barra de búsqueda de moto no funciona en el configurador

## Pasos para reproducir
1. Acceder al catálogo o configurador en http://localhost:5173
2. Intentar buscar una moto por nombre o filtro
3. Intentar usar los selectores en cascada para seleccionar marca/modelo/año
4. Los filtros y búsquedas no retornan resultados esperados

## Prioridad
Alta

## Responsable
Equipo de desarrollo

## Criterio de solución considerado solucionado
- La búsqueda en la tabla de usuarios filtra por nombre, email o rol con contador de resultados
- El selector marca → modelo → año funciona en cascada en el configurador
- La barra de búsqueda de moto está funcional en el configurador
- El filtro por tipo (multi-select) está disponible en catálogo y configurador
- Los tests validan que los filtros y búsquedas retornan resultados correctos

## Issue relacionado
Closes #02
