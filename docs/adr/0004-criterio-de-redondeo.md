# ADR 0004 — El redondeo de cuotas es `floor`, y es un dato, no una decisión de código

**Estado:** aceptada · **Fecha:** 2026-09-03 · **Fase:** F2

## Contexto

Las cuotas del enunciado se expresan como *"N credenciales por cada M m²"*: 2 por cada 5 m²
para `Exhibitor`, 2 por cada 10 m² para `Guest`, 3 por cada 10 m² para `Service`.

El enunciado no dice qué pasa cuando el metraje no es múltiplo del bloque, y la mayoría de los
metrajes válidos no lo son. Un stand de 13 m² con la regla `Exhibitor` puede dar 4 credenciales
(dos bloques completos) o 6 (tres bloques, contando el parcial). El enunciado admite ambas
lecturas y el sistema tiene que elegir una.

No es un detalle cosmético: sobre 50 m² la diferencia entre criterios es de credenciales
físicas que el organizador imprime y entrega.

## Decisión

**`floor`: solo se pagan bloques completos.** 13 m² → `2 * floor(13/5)` = **4**.

Y, más importante que el valor elegido: **el criterio es una columna**,
`credential_rules.rounding_mode`, con valores `floor` | `ceil` | `round`. El motor de reglas lo
lee de la fila; no hay un criterio por defecto escrito en el código.

Detalles de implementación:

- El cálculo es **aritmética entera**, no coma flotante: `floor` es `m2 // block`, `ceil` es
  `-(-m2 // block)`, `round` es `(2*m2 + block) // (2*block)`. Con `float` un `19.999...`
  intermedio convierte una cuota en otra sin que nada lo delate.
- `round` es **medio hacia arriba**, no el redondeo bancario de la función `round()` de Python:
  1.5 bloques son 2, no 2 por casualidad y 0 en el caso de 0.5. El negocio no espera
  redondeo al par.
- Un `rounding_mode` desconocido lanza `ValueError`. No se degrada a `floor` en silencio.

## Consecuencias

- **Un stand de 5–9 m² recibe 0 credenciales `Guest` y 0 `Service`.** Es la lectura literal de
  la regla y el comportamiento correcto, no un error. El frontend debe renderizar `0 / 0` sin
  romperse (CLAUDE.md §5.2). Está probado en `test_small_stand_gets_zero_guest_and_service`.
- El criterio es conservador para el organizador: nunca regala credenciales.
- Otra feria puede decidir distinto con un `UPDATE`, sin redeploy:

  ```sql
  UPDATE credential_rules SET rounding_mode = 'ceil' WHERE event_id = 1 AND category = 'Guest';
  ```

- Los tres modos están probados sobre el mismo metraje
  (`test_rounding_mode_comes_from_the_rule`). Nota: `round` coincide siempre con `floor` o con
  `ceil` —es matemáticamente imposible que los tres den tres valores distintos—, así que lo
  que se prueba es que cada modo se respeta y en qué mitad del bloque `round` cambia de lado.

## Alternativas descartadas

- **`ceil` (redondear siempre hacia arriba).** Favorece al expositor y es defendible
  comercialmente, pero no es lo que dice "por cada N m²", y hace que 51 m² —ya fuera de rango—
  y 50 m² den cuotas distintas por un metro que no se contrató.
- **`round` como criterio por defecto.** Es el más "justo" en promedio y el más difícil de
  explicar en una mesa: obliga a razonar sobre medios bloques para saber cuántas credenciales
  entrega un stand.
- **Fijar el criterio en el código y no parametrizarlo.** Sería exactamente el `if` que el
  enunciado dice que va a evaluar, escrito en el sitio menos visible.
