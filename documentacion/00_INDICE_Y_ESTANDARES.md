# 📚 Manual de Arquitectura y Documentación Técnica Integral
## Sistema de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Proyecto:** Plataforma de Gestión de Acreditaciones y Stands — Expo Flor Ecuador
- **Versión:** 1.0.0 (Release de Producción)
- **Fecha de Emisión:** 2026-09-04
- **Estado:** Aprobado / Línea Base de Arquitectura
- **Clasificación:** Confidencial / Documentación Técnica Oficial

---

## 1. Resumen Ejecutivo del Sistema

El sistema **Expo Flor Ecuador** es una plataforma web empresarial *multi-tenant* diseñada para gestionar el ciclo de vida completo de la feria internacional de flores, desde el registro de empresas expositoras y asignación de áreas de exhibición ($m^2$), hasta la acreditación individual y masiva de personal, cálculo automatizado de cupos según reglas de negocio parametrizables y emisión de credenciales de acceso.

### Objetivos Clave del Negocio
1. **Aislamiento Multi-Tenant Estricto:** Capacidad de gestionar múltiples ediciones o ferias (`events`) de forma simultánea, garantizando particionamiento de datos y seguridad *Zero-Trust* a nivel de repositorio.
2. **Integridad Transaccional y Control de Concurrencia:** Eliminación de *Race Conditions* o sobreasignación de cupos mediante bloqueos pesimistas (`SELECT ... FOR UPDATE`) en PostgreSQL.
3. **Cálculo de Reglas Parametrizable:** Soporte dinámico para diferentes modos de redondeo (`floor`, `ceil`, `round`) y bloques de metros cuadrados configurables por categoría de credencial (*Expositor, Invitado, Personal de Servicio*).
4. **Flujo de Autoservicio con Onboarding Seguro:** Enlace de activación único con tiempo de vida limitado (TTL 72h) y hash SHA-256 para representantes de stand.
5. **Carga Masiva Eficiente (Dry-Run en 2 Fases):** Validación previa de archivos XLSX en el cliente (SheetJS) y en el servidor con reporte de inconsistencias antes de la inserción definitiva.

---

## 2. Marco Normativo y Estándares de Ingeniería Aplicados

La documentación de este proyecto ha sido estructurada y elaborada siguiendo estándares internacionales de arquitectura, diseño y calidad de software:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MARCO NORMATIVO Y ESTÁNDARES                     │
├────────────────────────────────┬───────────────────────────────────────┤
│ Estándar / Marco               │ Aplicación en el Proyecto             │
├────────────────────────────────┼───────────────────────────────────────┤
│ ISO/IEC/IEEE 42010:2011        │ Descripción formal de la arquitectura │
│ IEEE Std 1016-2009             │ Especificación de diseño de software  │
│ arc42 Architecture Template    │ Estructura de navegación en 10 partes │
│ ISO/IEC 25010 (SQuaRE)         │ Modelo de atributos de calidad        │
│ STRIDE Threat Modeling         │ Análisis de seguridad y amenazas      │
│ RFC 7807                       │ Formato estándar de errores HTTP JSON │
│ RFC 2119                       │ Definición de niveles de requerimiento│
│ OpenAPI 3.1.0 / JSON Schema    │ Especificación de contratos REST      │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 3. Mapa de Navegación de la Documentación

La suite de documentación técnica se divide en los siguientes tomos y manuales especializados:

### 3.1. Tomos de Arquitectura e Ingeniería (Fases 00 a 10)
| Tomo | Archivo | Descripción del Contenido |
| :--- | :--- | :--- |
| **00** | [`00_INDICE_Y_ESTANDARES.md`](file:///home/jhon/Documentos/Expoflores/documentacion/00_INDICE_Y_ESTANDARES.md) | Índice general, estándares internacionales, glosario y visión ejecutiva. |
| **01** | [`01_ARQUITECTURA_DEL_SISTEMA_C4.md`](file:///home/jhon/Documentos/Expoflores/documentacion/01_ARQUITECTURA_DEL_SISTEMA_C4.md) | Modelo C4 (Contexto, Contenedores, Componentes), capas del Backend y Clean Architecture. |
| **02** | [`02_MODELO_DE_DATOS_Y_DICCIONARIO.md`](file:///home/jhon/Documentos/Expoflores/documentacion/02_MODELO_DE_DATOS_Y_DICCIONARIO.md) | Diagrama Entidad-Relación (DER), diccionario de datos exhaustivo, índices e invariantes SQL. |
| **03** | [`03_SEGURIDAD_CONCURRENCIA_Y_AMENAZAS_STRIDE.md`](file:///home/jhon/Documentos/Expoflores/documentacion/03_SEGURIDAD_CONCURRENCIA_Y_AMENAZAS_STRIDE.md) | Matriz STRIDE, locking pesimista (`FOR UPDATE`), ciclo de vida de tokens 72h y hashing Bcrypt/SHA-256. |
| **04** | [`04_MOTOR_DE_REGLAS_DE_NEGOCIO_Y_CUPOS.md`](file:///home/jhon/Documentos/Expoflores/documentacion/04_MOTOR_DE_REGLAS_DE_NEGOCIO_Y_CUPOS.md) | Algoritmos de cálculo de cupos, fórmulas de redondeo, categorías y validadores de cédula/RUC ecuatorianos. |
| **05** | [`05_CONTRATOS_API_Y_TOPOLOGIA_DE_ERRORES.md`](file:///home/jhon/Documentos/Expoflores/documentacion/05_CONTRATOS_API_Y_TOPOLOGIA_DE_ERRORES.md) | Especificación de endpoints REST, esquemas de entrada/salida y catálogo de 14 errores RFC 7807. |
| **06** | [`06_ARQUITECTURA_FRONTEND_Y_FLUJOS_UX.md`](file:///home/jhon/Documentos/Expoflores/documentacion/06_ARQUITECTURA_FRONTEND_Y_FLUJOS_UX.md) | Árbol jerárquico React 19, gestión de estado TanStack Query, diseño responsivo y flujo de importación XLSX. |
| **07** | [`07_REGISTRO_DE_DECISIONES_ARQUITECTONICAS_ADR.md`](file:///home/jhon/Documentos/Expoflores/documentacion/07_REGISTRO_DE_DECISIONES_ARQUITECTONICAS_ADR.md) | Registros de Decisiones de Arquitectura (ADR-0001 a ADR-0005). |
| **08** | [`08_DEVOPS_INFRAESTRUCTURA_Y_CI_CD.md`](file:///home/jhon/Documentos/Expoflores/documentacion/08_DEVOPS_INFRAESTRUCTURA_Y_CI_CD.md) | Orquestación Docker Compose, topología de red aislada, healthchecks y pipeline GitHub Actions. |
| **09** | [`09_PLAN_DE_PRUEBAS_Y_MATRIZ_DE_TRAZABILIDAD.md`](file:///home/jhon/Documentos/Expoflores/documentacion/09_PLAN_DE_PRUEBAS_Y_MATRIZ_DE_TRAZABILIDAD.md) | Estrategia de testing, desglose de 205 pruebas Pytest + 33 Vitest y matriz de trazabilidad de requisitos. |
| **10** | [`10_MANUAL_DE_OPERACION_Y_USUARIO.md`](file:///home/jhon/Documentos/Expoflores/documentacion/10_MANUAL_DE_OPERACION_Y_USUARIO.md) | Guía básica de operación para Administradores de Feria y Representantes de Stand. |

### 3.2. Manuales y Guías Operativas Especializadas (`documentacion/manuales/`)
| Manual | Archivo | Audiencia Objetivo y Alcance |
| :--- | :--- | :--- |
| **Usuario Administrador** | [`manuales/MANUAL_USUARIO_ADMINISTRADOR.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/MANUAL_USUARIO_ADMINISTRADOR.md) | Guía exhaustiva para directores y organizadores de Expoflores. |
| **Usuario Representante** | [`manuales/MANUAL_USUARIO_REPRESENTANTE.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/MANUAL_USUARIO_REPRESENTANTE.md) | Manual para empresas expositoras y coordinadores de stand. |
| **Despliegue & DevOps** | [`manuales/MANUAL_DE_DESPLIEGUE_Y_OPERACIONES.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/MANUAL_DE_DESPLIEGUE_Y_OPERACIONES.md) | Runbook para administradores de sistemas y DevOps. |
| **Seguridad & Auditoría** | [`manuales/MANUAL_DE_SEGURIDAD_Y_AUDITORIA.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/MANUAL_DE_SEGURIDAD_Y_AUDITORIA.md) | Guía de privacidad LOPDP, matriz RBAC y respuesta a incidentes. |
| **Guía para Desarrolladores** | [`manuales/GUIA_DE_CONTRIBUCION_Y_DESARROLLO.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/GUIA_DE_CONTRIBUCION_Y_DESARROLLO.md) | Onboarding para nuevos programadores y sincronización API. |
| **Manual Consolidado (PDF)** | [`manuales/MANUAL_TECNICO_CONSOLIDADO.md`](file:///home/jhon/Documentos/Expoflores/documentacion/manuales/MANUAL_TECNICO_CONSOLIDADO.md) | Documento unificado listo para imprimir o exportar a PDF. |

---

## 4. Glosario de Términos del Dominio

- **Acreditado / Participante (`Participant`):** Persona natural autorizada para portar una credencial oficial de acceso al recinto ferial. Pertenece a una de tres categorías: *Exhibitor* (personal del stand), *Guest* (invitado especial) o *Service* (personal de montaje o logística).
- **Bloque de Metraje (`Block M2`):** Unidad de medida base (ej. $12\,m^2$) utilizada para fraccionar el área de un stand y calcular el número de credenciales asignables.
- **Cuota / Cupo (`Quota`):** Cantidad máxima de credenciales que un stand tiene derecho a emitir por categoría según su metraje y las reglas activas de la feria.
- **Dry-Run (Validación en Seco):** Ejecución de la lógica de validación de un lote de datos sin persistir cambios en la base de datos, retornando un reporte de filas válidas y anomalías.
- **Expositor (`Exhibitor`):** Entidad jurídica o comercial que contrata un stand en la feria para exhibir sus productos o servicios.
- **Feria / Evento (`Event`):** Instancia temporal y contextual de una feria (ej. *Expo Flor Ecuador 2026*). Constituye la frontera de aislamiento de datos (*Tenant*).
- **Locking Pesimista (`SELECT FOR UPDATE`):** Estrategia de control de concurrencia que bloquea las filas requeridas en base de datos al inicio de una transacción para evitar interferencias por escrituras concurrentes.
- **Magic Link / Token de Configuración (`Password Setup Token`):** Enlace seguro de un solo uso con caducidad de 72 horas enviado por correo electrónico para que el expositor establezca su contraseña sin intermediación humana.
- **RFC 7807 (Problem Details):** Estándar del IETF que define un formato JSON unificado para comunicar detalles de errores en APIs HTTP.
- **Representante (`Representative`):** Persona de contacto principal y responsable legal o comercial del stand ante la organización de la feria.
- **Stand:** Espacio físico asignado en el recinto ferial caracterizado por su metraje en metros cuadrados ($m^2$) y dimensiones.
