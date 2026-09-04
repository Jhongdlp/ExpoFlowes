# Datos iniciales

## Cómo se crea el esquema

**No hay que ejecutar `esquema.sql` a mano.** El esquema lo aplica Alembic al arrancar el
backend: el contenedor ejecuta `alembic upgrade head` y después `python -m app.seed` antes de
levantar la API, así que `docker compose up -d --build` deja la base creada y sembrada.

El volcado [`esquema.sql`](esquema.sql) se incluye para poder leer la estructura sin ejecutar
nada; se generó con `alembic upgrade head --sql`. La fuente de verdad es la migración, en
`2_Aplicacion/Back/alembic/versions/`.

Para hacerlo a mano:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed
```

## Qué siembra el seed

| Datos | Contenido |
|---|---|
| Evento | Expo Flor Ecuador 2026, activo |
| `stand_size_rules` | Pequeño 5–12 · Mediano 13–30 · Grande 31–50 m² |
| `credential_rules` | Exhibitor 2/5 m² · Guest 2/10 m² · Service 3/10 m², redondeo `floor` |
| Usuarios | 1 administrador y 1 representante con contraseña; los otros dos representantes nacen sin contraseña, como en el flujo real |
| Expositores | 3 empresas con su representante, sus contactos y algunos participantes |

**El seed es idempotente.** Hace *upsert* por clave natural (`slug`, `label`, `category`,
`email`, `tax_id`), así que correrlo dos veces no falla ni duplica. Tampoco pisa la contraseña
de un representante que ya la haya establecido.

**Todos los datos son ficticios.** Ninguna cédula, RUC ni correo corresponde a una persona o
empresa real; las identificaciones son válidas por algoritmo pero generadas.

Las credenciales de demostración están en el README de `2_Aplicacion/` y en la propia pantalla
de login.

## Cambiar las reglas sin tocar código

```sql
UPDATE stand_size_rules SET max_m2 = 80 WHERE event_id = 1 AND label = 'Grande';
UPDATE credential_rules SET rounding_mode = 'ceil' WHERE event_id = 1 AND category = 'Guest';
```

Surte efecto en la siguiente petición: el motor de reglas lee estas tablas en cada operación y
no las cachea. No hace falta reiniciar ni redesplegar.
