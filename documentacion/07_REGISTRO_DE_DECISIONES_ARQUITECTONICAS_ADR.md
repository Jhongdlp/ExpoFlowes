# 📋 Registros de Decisiones de Arquitectura (ADR)
## Sistema de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** DOC-07-ADR-RECORDS
- **Estándar:** MADR (Markdown Architectural Decision Records) / arc42 Sección 9
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## Índice de Decisiones Registradas

- [ADR-0001: Bloqueo Pesimista a Nivel de Fila (`SELECT FOR UPDATE`) para Control de Cupos](#adr-0001-bloqueo-pesimista-a-nivel-de-fila-para-control-de-cupos)
- [ADR-0002: Hard-Delete en Participantes vs Soft-Delete en Expositores](#adr-0002-hard-delete-en-participantes-vs-soft-delete-en-expositores)
- [ADR-0003: Inyección Forzada de `event_id` en Capa de Repositorios (Multi-Tenancy)](#adr-0003-inyeccion-forzada-de-event_id-en-capa-de-repositorios-multi-tenancy)
- [ADR-0004: Validación de Carga Masiva XLSX en 2 Fases (Cliente SheetJS + Servidor Dry-Run)](#adr-0004-validacion-de-carga-masiva-xlsx-en-2-fases)
- [ADR-0005: Formato de Errores RFC 7807 Problem Details y Tipado Estricto](#adr-0005-formato-de-errores-rfc-7807-problem-details-y-tipado-estricto)

---

### ADR-0001: Bloqueo Pesimista a Nivel de Fila para Control de Cupos

- **Estado:** Aceptado
- **Fecha:** 2026-08-15
- **Decisores:** Equipo de Arquitectura de Software

#### Contexto y Problema
En eventos feriales con alta concurrencia, representantes de un mismo stand o procesos automatizados pueden emitir peticiones simultáneas de acreditación cuando solo resta 1 cupo disponible. Sin control transaccional estricto, ocurre una condición de carrera (*Double-Spending* de cupos), permitiendo que ambos hilos lean el cupo como disponible e inserten dos participantes, sobrepasando la cuota legal del stand.

#### Decisión
Implementar **bloqueo pesimista a nivel de fila (`SELECT ... FOR UPDATE`)** en PostgreSQL sobre el registro del expositor en la transacción de acreditación individual y carga masiva.

#### Consecuencias
- **Positivas (+):** Garantía matemática absoluta de que la cuota nunca será excedida; transacciones serializadas por stand; simplicidad conceptual y consistencia ACID inmediata.
- **Negativas (-):** Ligera serialización temporal para peticiones simultáneas del **mismo** stand. Stands distintos no se bloquean entre sí.

---

### ADR-0002: Hard-Delete en Participantes vs Soft-Delete en Expositores

- **Estado:** Aceptado
- **Fecha:** 2026-08-18
- **Decisores:** Equipo de Arquitectura de Software

#### Contexto y Problema
Si un expositor elimina a un participante acreditado para corregir un error o registrar a otra persona, ¿debe usarse borrado lógico (*soft-delete*) o borrado físico (*hard-delete*)? La base de datos tiene una restricción de unicidad estricta `UNIQUE (event_id, identification)`.

#### Decisión
1. **Para `exhibitors`:** Usar **Soft-Delete** (`deleted_at = NOW()`) para preservar contratos, auditoría histórica y estadísticas comerciales.
2. **Para `participants`:** Usar **Hard-Delete Físico** (`DELETE FROM participants WHERE id = :id`).

#### Consecuencias
- **Positivas (+):** Al eliminar un participante, se libera de forma atómica e inmediata tanto la cédula/pasaporte en el índice único como el cupo de la categoría para el stand, sin requerir índices parciales complejos o scripts de purga.
- **Negativas (-):** Se pierde el historial de acreditaciones canceladas (mitigado mediante logs de auditoría estructurados del servidor).

---

### ADR-0003: Inyección Forzada de `event_id` en Capa de Repositorios (Multi-Tenancy)

- **Estado:** Aceptado
- **Fecha:** 2026-08-20
- **Decisores:** Equipo de Arquitectura de Software

#### Contexto y Problema
En un sistema multi-tenant donde conviven múltiples ferias en la misma base de datos, un olvido de filtro `WHERE event_id = :event_id` en una consulta podría ocasionar fugas de información (*Information Disclosure*) entre eventos.

#### Decisión
Crear la clase base abstracta `EventScopedRepository(db, event_id)` de la cual deben heredar **obligatoriamente** todos los repositorios del sistema. El constructor valida la presencia de `event_id` y todos los métodos inyectan dicho filtro en las cláusulas WHERE de SQLAlchemy.

#### Consecuencias
- **Positivas (+):** Imposibilidad arquitectónica de ejecutar consultas globales accidentales; aislamiento de datos probado a nivel de repositorio.
- **Negativas (-):** Todo servicio debe instanciar los repositorios suministrando el `event_id` extraído del token JWT.

---

### ADR-0004: Validación de Carga Masiva XLSX en 2 Fases

- **Estado:** Aceptado
- **Fecha:** 2026-08-24
- **Decisores:** Equipo de Arquitectura de Software & UX

#### Contexto y Problema
La subida de archivos Excel con cientos de filas suele fallar por errores tipográficos en cédulas o nombres en filas individuales. Si la inserción falla en la fila 80 de 100, el usuario queda en un estado ambiguo.

#### Decisión
Dividir el flujo en dos fases:
1. **Fase 1 (Dry-Run):** El cliente procesa el XLSX con SheetJS y envía los registros con `?dry_run=true`. El backend ejecuta todas las validaciones de dominio y simulación de cupo sin persistir en BD, devolviendo un informe detallado.
2. **Fase 2 (Commit Definitivo):** Tras la aprobación visual del usuario, se envía el lote con `?dry_run=false` ejecutando la inserción en una sola transacción atómica (*All-or-Nothing*).

#### Consecuencias
- **Positivas (+):** Experiencia de usuario transparente; reducción del 95% de errores en servidor; feedback visual inmediato con filas resaltadas en verde/rojo.
- **Negativas (-):** Requiere dos llamadas HTTP por cada proceso de carga.

---

### ADR-0005: Formato de Errores RFC 7807 Problem Details y Tipado Estricto

- **Estado:** Aceptado
- **Fecha:** 2026-08-28
- **Decisores:** Equipo de Arquitectura de Software

#### Contexto y Problema
Los errores genéricos de FastAPI/Starlette (`{"detail": "Error string"}`) son difíciles de interpretar y localizar programáticamente por el cliente React.

#### Decisión
Adoptar el estándar **RFC 7807 (Problem Details)** implementando un manejador global de excepciones que transforma los `DomainError` en respuestas estructuradas con `type`, `title`, `status`, `detail`, `code` y `params` serializados.

#### Consecuencias
- **Positivas (+):** El cliente frontend mapea de forma determinista el campo `code` a notificaciones UI localizadas; depuración precisa con metadatos contextuales en `params`.
- **Negativas (-):** Mayor verbosidad en las respuestas de error HTTP.
