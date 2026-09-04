# 🧪 Plan de Pruebas, Cobertura y Matriz de Trazabilidad (RTM)
## Sistema de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** DOC-09-QA-RTM
- **Estándar:** IEEE Std 829-2008 (Software Test Documentation) / ISO/IEC 25010
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## 1. Estrategia de Pruebas (Pirámide de Testing)

El aseguramiento de la calidad de **Expo Flor Ecuador** combina pruebas unitarias puras, pruebas de integración contra PostgreSQL real y pruebas de interfaz de usuario:

```
                  ┌────────────────────────┐
                  │  Pruebas UI / E2E      │  (Flujos de usuario completos)
               ┌──┴────────────────────────┴──┐
               │   Pruebas de Integración     │  (FastAPI + PostgreSQL Real: 205 tests)
            ┌──┴──────────────────────────────┴──┐
            │       Pruebas Unitarias Puras      │  (Dominio, Reglas, Algoritmos: 79 tests)
         ┌──┴────────────────────────────────────┴──┐
         │     Análisis Estático y Tipado Estricto  │  (Mypy strict, Ruff, Oxlint, TypeScript)
         └──────────────────────────────────────────┘
```

---

## 2. Resumen Ejecutivo de Cobertura

- **Backend (Pytest 9.1.1):** **205 pruebas ejecutadas y aprobadas (100% éxito)**.
- **Frontend (Vitest 5.0.0):** **33 pruebas ejecutadas y aprobadas (100% éxito)**.
- **Validación de Diagramas Mermaid:** **17 diagramas parseados sin errores**.
- **Análisis de Tipos TypeScript:** **0 errores (`tsc -b --noEmit`)**.

---

## 3. Desglose de Suites de Pruebas del Backend

| Suite de Pruebas | Tests | Alcance y Verificación de Requisitos |
| :--- | :---: | :--- |
| `test_auth.py` | 14 | Autenticación JWT, contraseñas cortas, prevención de *timing attacks* con dummy hash. |
| `test_authz.py` | 10 | Control de acceso basado en roles (RBAC: `admin` vs `representative`). |
| `test_bulk_upload.py` | 15 | Importación masiva XLSX, dry-run, reporte de errores y consistencia atómica. |
| `test_constraints.py` | 8 | Unicidad de cédula por feria, índices parciales y soft-delete de expositores. |
| `test_dashboards.py` | 16 | Agregación de cupos por categoría, paginación y filtros de búsqueda. |
| `test_emails.py` | 12 | Despacho asíncrono de correos con plantillas HTML y tokens de 72h. |
| `test_exhibitors.py` | 19 | Ciclo de vida de empresas expositoras, representantes y contactos. |
| `test_health.py` | 2 | Sondas de salud `/health` y conectividad con la base de datos. |
| `test_participants.py` | 18 | Registro individual, validación de empresa proveedora y eliminación física. |
| `test_quota_concurrency.py` | 1 | Prueba de estrés con hilos compitiendo por el último cupo con `FOR UPDATE`. |
| `test_rules_parametrization.py` | 6 | Reconfiguración dinámica de metraje y recálculo automático de cuotas. |
| `test_search.py` | 5 | Búsqueda insensible a mayúsculas/acentos en listados globales. |
| `test_identification.py` | 35 | Algoritmos Módulo 10 y Módulo 11 para cédulas y RUCs ecuatorianos. |
| `test_rules.py` | 44 | Verificación matemática de los modos de redondeo `floor`, `ceil` y `round`. |

---

## 4. Matriz de Trazabilidad de Requisitos (RTM)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MATRIZ DE TRAZABILIDAD DE REQUISITOS (RTM)                      │
├───────┬─────────────────────────────┬───────────────────────────┬──────────────────────┤
│ Req ID│ Requisito Funcional / RF    │ Módulo de Implementación  │ Prueba Automatizada  │
├───────┼─────────────────────────────┼───────────────────────────┼──────────────────────┤
│ RF-01 │ Aislamiento Multi-Tenant    │ `EventScopedRepository`   │ `test_authz.py`      │
│ RF-02 │ Bloqueo Pesimista de Cupos  │ `ParticipantRepository`   │ `test_quota_concurrency.py` │
│ RF-03 │ Redondeos Parametrizables   │ `app/domain/rules.py`     │ `test_rules.py`      │
│ RF-04 │ Validación Cédula / RUC     │ `identification.py`       │ `test_identification.py` │
│ RF-05 │ Token Activación 72h        │ `auth_service.py`         │ `test_emails.py`     │
│ RF-06 │ Carga Masiva Dry-Run        │ `BulkUploadPage.tsx`      │ `test_bulk_upload.py`│
│ RF-07 │ Errores RFC 7807            │ `app/core/errors.py`      │ `errors.test.ts`     │
│ RF-08 │ Eliminación Física Acredit. │ `participant_service.py`  │ `test_participants.py` │
│ RF-09 │ Soft-Delete Expositores     │ `exhibitor_service.py`    │ `test_constraints.py`│
│ RF-10 │ Renderizado Diagramas       │ `MermaidDiagram.tsx`      │ `DocumentationPage.test.ts` │
└───────┴─────────────────────────────┴───────────────────────────┴──────────────────────┘
```
