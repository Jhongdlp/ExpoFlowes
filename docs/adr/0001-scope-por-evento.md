# ADR 0001 — Scope por evento en todo el modelo de datos

**Estado:** aceptada · **Fecha:** 2026-09-03 · **Fase:** F1

## Contexto

El enunciado exige que el modelo permita crear nuevas ferias en el futuro **sin que los datos
se mezclen**. La prueba se centra en *Expo Flor Ecuador 2026*, pero una sola edición no puede
quedar cableada en el esquema.

El riesgo concreto no es no poder crear una segunda feria: es crearla y que las consultas
existentes empiecen a devolver datos de las dos. Un `SELECT * FROM participants` escrito hoy
sin `event_id` es correcto mientras exista una feria y silenciosamente incorrecto el día que
existan dos.

Además, la restricción crítica del enunciado —una persona no puede estar en dos empresas—
tiene un alcance que el enunciado no define: ¿global o por edición?

## Decisión

1. **Toda tabla operativa lleva `event_id`**, incluidas las que podrían derivarlo por FK
   (`participants` podría llegar al evento vía `exhibitors`). Se acepta la redundancia
   controlada a cambio de que ninguna consulta necesite un JOIN para aislar.
2. **Ninguna restricción única es simple.** Todas son compuestas con `event_id`:
   `UNIQUE(event_id, identification)`, `UNIQUE(event_id, tax_id)`, `UNIQUE(event_id, email)`,
   `UNIQUE(event_id, label)`, `UNIQUE(event_id, category)`.
3. **Las reglas de negocio también son por evento**: `stand_size_rules` y `credential_rules`
   cuelgan de `events`. Cada feria puede tener rangos y cuotas distintos.
4. **`event_id` viaja en el claim del JWT**, no en la URL. Los repositorios lo exigen como
   parámetro obligatorio; no existe un método de listado sin él.

## Consecuencias

- La misma persona puede registrarse en la feria 2026 y en la 2027 con empresas distintas.
  Es el comportamiento correcto: las ediciones son independientes y la gente cambia de
  empleador (ver CLAUDE.md §6.6, probado en `test_same_identification_in_two_events_is_allowed`).
- Crear una feria nueva es insertar una fila en `events` más sus dos tablas de reglas. No
  requiere migración, redeploy ni tocar código.
- `event_id` se repite en tablas que podrían derivarlo. Es redundancia deliberada: el coste es
  una columna; el beneficio es que el aislamiento no depende de que nadie olvide un JOIN.
- El MVP crea un solo evento activo y el admin opera sobre él. El selector multi-evento para
  el admin queda fuera de alcance; el esquema ya lo soporta sin cambios.

## Alternativas descartadas

- **Base de datos o esquema por feria.** Aísla perfecto y complica todo lo demás: migraciones
  N veces, conexiones dinámicas, reportes cruzados imposibles. Desproporcionado para un MVP.
- **Columna `event_id` solo en las tablas raíz** (`exhibitors`) y derivar el resto por JOIN.
  Más normalizado, pero deja el aislamiento a merced de que cada consulta recuerde el JOIN.
  El fallo sería silencioso, que es exactamente lo que se quiere evitar.
- **Restricción global `UNIQUE(identification)`.** Bloquearía altas legítimas entre ediciones
  y rompería el aislamiento en la única regla donde más duele.
