# Pruebas automáticas

## 110 pruebas en total

| Suite | Archivo | Cuántas | Necesita BD |
| --- | --- | --- | --- |
| Traducciones / i18n | `api/tests.py` | ~14 | No |
| Servicios (reglas puras) | `api/test_services.py` | 23 | No |
| Endpoints (sin BD) | `api/test_endpoints.py` | ~52 | No |
| Comandos de gestión | `api/test_comandos.py` | ~9 | No |
| **Integración con PostgreSQL real** | `api/test_integracion.py` | **12** | **Sí** |

Totales: **98 unitarias** (se ejecutan siempre) + **12 de integración**
(se omiten salvo `RUN_DB_TESTS=1`).

## Unitarias (sin base de datos)

Se ejecutan en local y en CI sin necesidad de PostgreSQL. Las peticiones a
endpoints que tocarían la base se prueban con `override_settings(DATABASE_URL="")`,
de modo que la capa de datos responde `503` coherente sin requerir conexión
(p. ej. el test de rate limit usa el alcance `register` y espera un `429` del
throttle antes de llegar a la capa de BD).

```bash
cd backend
venv\Scripts\python.exe manage.py test api
```

Resultado esperado:

```
Ran 110 tests ... OK (skipped=12)
```

> El runner está personalizado (`motopreview/test_runner.NoDbTestRunner`):
> **no crea base de prueba** en las corridas normales. Con `MOTOPREVIEW_DATABASE_URL`
> configurada, el `DiscoverRunner` estándar intentaría crear y borrar
> `test_<nombre>` en cada corrida, lo que falla detrás de un pooler (Neon):
> `CREATE/DROP DATABASE` no está disponible y el pooler mantiene sesiones que
> impiden el `DROP`. El runner solo prepara la base cuando `RUN_DB_TESTS=1`.

## De integración (PostgreSQL real)

Cubren flujos completos contra la base real:

1. Registro público → token firmado → verificación → login.
2. Login bloqueado sin correo verificado (`403`).
3. Compatibilidad con tokens de verificación legacy.
4. Rechazo de contraseñas de más de 72 bytes y de emails duplicados.
5. Cotizaciones: totales correctos, accesorios inexistentes, transiciones
   válidas/inválidas, historial, y vistas por cliente vs. admin/vendedor.
6. Inventario: creación, entrada/salida, estado del stock, negativo rechazado
   y autenticación obligatoria.

Los modelos de negocio son `managed=False` (sin migraciones), así que el módulo
monta el esquema sobre la base de prueba antes de correr los flujos: enums de
PostgreSQL, todas las tablas y la tabla compuesta `usuario_rol`.

### Requisitos

- Una `MOTOPREVIEW_DATABASE_URL` cuyo usuario pueda **crear bases** (el runner
  crea `test_<nombre>`). Detrás del pooler de Neon se recomienda usar el host
  directo (sin `-pooler`) para la prueba.
- Ejecutar con `--keepdb` para evitar el `DROP` final que el pooler bloquea.

```powershell
$env:RUN_DB_TESTS = "1"
cd backend
venv\Scripts\python.exe manage.py test api.test_integracion --keepdb -v 2
```

Resultado esperado:

```
Ran 12 tests ... OK
Preserving test database for alias 'default' ('test_neondb')...
```

### Notas

- El esquema se crea **en el runner** (`NoDbTestRunner.setup_databases`), fuera
  de las transacciones de cada `TestCase`. Si se montara dentro de un
  `setUpClass`, el DDL viviría en la transacción atómica de la clase y se
  revertiría al cerrarla.
- La base `test_<nombre>` queda creada tras usar `--keepdb`. Para borrarla
  después, terminar sesiones y soltar la base desde una conexión a otra database:
  `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='test_neondb';`
  y luego `DROP DATABASE IF EXISTS test_neondb;`

## CI

`.github/workflows` ejecuta el backend **sin base de datos** (vale con
`MOTOPREVIEW_DATABASE_URL` vacía): `manage.py check`, lint y `manage.py test api`
(98 pruebas unitarias + 12 de integración omitidas). Los tests de integración
requieren credenciales de Neon y por eso se dejan fuera de CI salvo que se
configuren expresamente.