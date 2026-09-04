# ADR 0002 — Las reglas de metraje y cuota viven en tablas, no en código

**Estado:** aceptada · **Fecha:** 2026-09-03 · **Fase:** F1

## Contexto

El enunciado es explícito: *"Se evaluará si estos rangos son modificables (parametrizados) o
están quemados en código"*. Es el único de los tres puntos extra sobre el que dice que se
evaluará, y por tanto el de mayor peso.

Las reglas son dos familias distintas:

- **Clasificación de stand por metraje**: Pequeño 5–12, Mediano 13–30, Grande 31–50 m².
- **Cuota de credenciales**: 2 por cada 5 m² (`Exhibitor`), 2 por cada 10 m² (`Guest`),
  3 por cada 10 m² (`Service`).

La tentación obvia —`if m2 <= 12: return "Pequeño"`— funciona hoy y convierte cada cambio de
regla del organizador en un ciclo de desarrollo, pull request y despliegue.

## Decisión

1. Dos tablas, ambas con `event_id`:
   - `stand_size_rules(label, min_m2, max_m2)`
   - `credential_rules(category, credentials_per_block, block_m2, rounding_mode)`
2. La cuota se expresa como una **fórmula parametrizada**, no como valores por categoría:
   `cuota = credentials_per_block * redondeo(m2 / block_m2)`.
   El criterio de redondeo es **un dato más** (`rounding_mode`), no una decisión de código:
   otra feria puede pasar a `ceil` con un `UPDATE`.
3. El motor de reglas (`app/domain/rules.py`, F2) es un **módulo puro**: recibe las reglas
   como parámetro y no importa SQLAlchemy, FastAPI ni la configuración. Es testeable sin base.
4. **No existe columna de cuota ni de categoría de stand.** Ambas son derivadas y se calculan
   en lectura con las reglas vigentes (ver CLAUDE.md §6.4).

## Consecuencias

- Cambiar una regla es un `UPDATE`, sin redeploy:

  ```sql
  UPDATE stand_size_rules SET max_m2 = 80 WHERE event_id = 1 AND label = 'Grande';
  UPDATE credential_rules  SET rounding_mode = 'ceil' WHERE event_id = 1 AND category = 'Guest';
  ```

- El test R7 (`test_changing_range_changes_classification`) demuestra que el cambio surte
  efecto sin tocar código. Es la evidencia directa del criterio que el enunciado dice evaluar.
- Los rangos pueden quedar **incompletos o solapados** si alguien los edita mal. Se asume:
  un metraje que no cae en ningún rango se rechaza con `STAND_SIZE_OUT_OF_RANGE` en vez de
  clasificarse por defecto (§6.2). Un error explícito es recuperable; un dato mal clasificado
  que alimenta el cálculo de credenciales, no.
- Cualquier `if m2 > 12` que aparezca en el código es un fallo de la entrega, no un atajo.

## Alternativas descartadas

- **Constantes en un módulo de configuración de Python.** Sigue siendo código: cambiarlas
  exige redeploy y no permite reglas distintas por feria.
- **Archivo JSON/YAML de configuración.** Evita el redeploy solo a medias (hay que montar y
  recargar el archivo), no es transaccional y no se puede versionar por evento sin inventar
  una estructura que ya es, de hecho, una tabla peor hecha.
- **CRUD de reglas por API.** El enunciado no lo pide y añade superficie de seguridad sobre
  la pieza más sensible del sistema. Los endpoints de reglas son de solo lectura; la
  modificación se hace por SQL o seed, documentada en el README.
