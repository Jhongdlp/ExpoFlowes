# Plataforma de expositores y credenciales — Expo Flor Ecuador

[![CI](https://github.com/Jhongdlp/ExpoFlowes/actions/workflows/ci.yml/badge.svg)](https://github.com/Jhongdlp/ExpoFlowes/actions/workflows/ci.yml)
[![Demo](https://img.shields.io/badge/demo-expoflores.jhongdlp.com-1b3a30)](https://expoflores.jhongdlp.com)
[![Despliegue](https://img.shields.io/badge/deploy-Dokploy%20%C2%B7%20VPS-a83a63)](#despliegue-cicd-en-un-vps-con-dokploy)

> ### ▶︎ Pruébelo ahora: **<https://expoflores.jhongdlp.com>**
>
> | Rol | Correo | Contraseña |
> |---|---|---|
> | Organización de la feria | `admin@expoflores.demo` | `Admin123!` |
> | Representante de stand | `mariana.cevallos@rosascotopaxi.demo` | `Demo1234!` |
>
> Las dos cuentas están también en la propia pantalla de login, a un clic. Cada push a `main`
> que pasa la CI se despliega ahí solo ([cómo](#despliegue-cicd-en-un-vps-con-dokploy)).
> Datos ficticios, `noindex`, y un banner permanente que avisa de que no está afiliado a
> Expoflores.
>
> **Presentación de 5 páginas:** [`docs/presentacion.pdf`](docs/presentacion.pdf).

Gestión de las empresas que exponen en una feria y de las credenciales del personal que opera
sus stands. El administrador registra expositores y ve, stand por stand, cuántas credenciales
tiene asignadas y cuántas le quedan; el representante de cada empresa acredita a su gente —una
a una o subiendo un Excel— dentro del cupo que le corresponde por metraje.

El modelo está construido para **varias ferias sin mezclar datos**: toda tabla operativa lleva
`event_id`, todo repositorio exige ese `event_id` para existir, y el `event_id` sale siempre
del token, nunca de la petición. La misma persona puede acreditarse en la edición 2026 y en la
2027 con empresas distintas, y no puede estar en dos stands de la misma edición.

**Las reglas de negocio no están en el código.** Los rangos de metraje, las cuotas por
categoría y hasta el criterio de redondeo viven en dos tablas de configuración. Cambiar un
rango es un `UPDATE`; no hay redeploy y no hay `if m2 > 12` en ninguna parte del repositorio
([cómo hacerlo](#cambiar-las-reglas-sin-tocar-código)).

---

## Índice

- [Demo en vivo](#demo-en-vivo)
- [Stack](#stack)
- [Levantar el proyecto](#levantar-el-proyecto)
- [Credenciales de demostración](#credenciales-de-demostración)
- [Correo](#correo)
- [Tests](#tests)
- [Despliegue: CI/CD en un VPS con Dokploy](#despliegue-cicd-en-un-vps-con-dokploy)
- [Cambiar las reglas sin tocar código](#cambiar-las-reglas-sin-tocar-código)
- [Reglas de negocio vigentes](#reglas-de-negocio-vigentes)
- [Decisiones que sostienen la entrega](#decisiones-que-sostienen-la-entrega)
- [Trazabilidad: requisito → test](#trazabilidad-requisito--test)
- [Estructura del repositorio](#estructura-del-repositorio)
- [API](#api)

---

## Demo en vivo

**<https://expoflores.jhongdlp.com>** — desplegado en un VPS propio, con HTTPS y certificado
automático. Es el mismo `docker-compose.yml` del repositorio: no hay una configuración
«de producción» distinta que pudiera divergir de lo que usted levanta en su máquina.

Qué mirar en tres minutos, si tiene poco tiempo:

| Entre como | Y vaya a | Para ver |
|---|---|---|
| Organización | **Reglas** (`/admin/reglas`) | Las dos tablas de configuración leídas de la base, y un simulador de cuota. Es el punto que el enunciado dice que se evalúa. |
| Organización | **Panel** | Cupo emitido vs. disponible de toda la feria, con la categoría de cada stand derivada del metraje. |
| Representante | **Nueva credencial** | Escriba la identificación `1800000042` y guarde: es de alguien ya acreditado por otra empresa. Aparece el bloque de duplicado con el nombre de esa empresa. |
| Representante | **Carga masiva** | Suba `datos_de_mocks/07_prueba_errores_de_validacion_filas.xlsx`: valida fila por fila y no importa nada mientras haya un error. |
| Representante | **Imprimir credenciales** | Hoja de gafetes de 90 × 130 mm, cuatro por hoja A4, armada en el navegador sin librería de PDF. |

Higiene del demo: `noindex` por meta, `robots.txt` y cabecera `X-Robots-Tag`; banner permanente
de «datos ficticios, no afiliado a Expoflores»; y ni una cédula ni un correo de persona real —
las identificaciones son válidas por algoritmo, pero generadas.

---

## Stack

**Backend** · Python 3.12 · FastAPI · Pydantic v2 · SQLAlchemy 2.0 (sintaxis moderna, sin el
`Query` legacy) · Alembic · PostgreSQL 16 · JWT (`python-jose` + `passlib[bcrypt]`) ·
`openpyxl` · `slowapi` · `pytest` + `httpx` · `ruff` + `mypy --strict`.

**Frontend** · React 19 · Vite · TypeScript en modo estricto (`strict`,
`noUncheckedIndexedAccess`, sin `any`) · TanStack Query · react-hook-form + zod · Tailwind CSS con
un set propio de componentes · SheetJS para leer el Excel en el navegador · `oxlint` + `vitest`.

**Infraestructura** · Docker Compose con tres servicios: `db`, `backend`, `frontend` · GitHub
Actions para lint, tipos y tests · despliegue automático a un VPS propio con Dokploy
([detalle](#despliegue-cicd-en-un-vps-con-dokploy)).

Los tipos de la API del frontend **no se escriben a mano**: se generan desde el esquema OpenAPI
con `npm run gen:api`, y el `tsc` falla si el backend cambia un campo.

---

## Levantar el proyecto

Requisitos: Docker y Docker Compose. Nada más — no hace falta Python ni Node en la máquina.

```bash
cp .env.example .env          # los valores por defecto sirven para el demo
docker compose up -d --build
```

El contenedor del backend aplica las migraciones y siembra los datos al arrancar, así que al
terminar el comando el demo ya es utilizable:

| Servicio | URL |
|---|---|
| Frontend | <http://localhost:5173> |
| API | <http://localhost:8000/api/v1> |
| Documentación interactiva | <http://localhost:8000/docs> |
| Salud (verifica la base con `SELECT 1`) | <http://localhost:8000/api/v1/health> |

La base no publica ningún puerto en el host: solo la usa el backend por la red interna, así
que un Postgres local no estorba. Para inspeccionarla, `docker compose exec db psql -U
expoflores -d expoflores`.

Los dos pasos automáticos también se pueden ejecutar a mano; ambos son **idempotentes**:

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.seed
```

---

## Credenciales de demostración

Sirven igual en local y en el [demo público](https://expoflores.jhongdlp.com), y están visibles
en la propia pantalla de login con un botón que las rellena.

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador de la feria | `admin@expoflores.demo` | `Admin123!` |
| Representante de stand | `mariana.cevallos@rosascotopaxi.demo` | `Demo1234!` |

Los otros dos representantes del seed **nacen sin contraseña**, como cualquier representante
recién creado: para entrar necesitan el enlace de un solo uso que el sistema envía por correo
(ver abajo). Es el comportamiento real, no una limitación del demo.

Todos los datos son ficticios. Ninguna cédula ni correo corresponde a una persona real; las
identificaciones son válidas por algoritmo pero generadas.

---

## Correo

Se envían dos correos, siempre **después del `COMMIT`** y fuera de la transacción: al
representante cuando se crea su cuenta (enlace para establecer contraseña, 72 h, un solo uso —
**nunca una contraseña**) y al participante cuando se le asigna una credencial, si tiene correo.
Un fallo del SMTP se registra en el log y **no revierte** la operación de negocio; hay un test
que lo demuestra (`test_mailer_failure_does_not_rollback`).

Con `SMTP_HOST` vacío —el valor por defecto— el mailer **no envía nada**: escribe el correo
renderizado en el log estructurado, que es el "correo simulado" que el enunciado admite. Para
verlo:

```bash
docker compose logs -f backend | grep mail_
```

Para enviar de verdad, ponga en el `.env` las credenciales de un inbox sandbox de Mailtrap y
reinicie el backend (`docker compose up -d backend`). No hay código que cambiar:

```dotenv
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=<usuario del inbox>
SMTP_PASSWORD=<contraseña del inbox>
```

Los valores están en Mailtrap → *Sandboxes* → su sandbox → *Integration* → pestaña *SMTP*.
El cifrado es **oportunista**: se usa STARTTLS cuando el servidor lo ofrece —Mailtrap
lo hace— y se sigue sin él cuando no, para que el mismo mailer sirva con un buzón de captura
local. Para comprobar que llegan, cree un expositor desde la interfaz (correo al representante)
y luego una credencial con correo (correo al participante).

El sandbox gratuito limita los envíos por segundo y responde `550` si se le mandan dos
seguidos. Es el caso que el diseño ya contempla: el fallo queda en el log, la credencial se da
de alta igual y `credential_notified_at` se queda sin marcar, así que el aviso vuelve a
intentarse la próxima vez que se edite esa credencial.

Para probar el alta de un representante sin acceso al inbox, `EXPOSE_SETUP_LINK=true` devuelve
el enlace de establecer contraseña en la respuesta del alta. **Es un interruptor de demo**: en
producción se queda en `false` y el enlace viaja solo por correo.

---

## Tests

```bash
docker compose exec backend pytest -q                 # toda la suite
docker compose exec backend pytest tests/unit -q      # motor de reglas, sin base de datos
cd frontend && npm test                               # lectura del Excel, esquemas y errores
```

Los tests de integración crean su propia base (`<base>_test`) y cada test corre dentro de una
transacción que se revierte al terminar. En la suite **no sale ni un correo**.

Los del frontend cubren lo que tiene lógica propia —la lectura del Excel en el navegador, el
campo condicional del formulario y el mapa de códigos de error—, no el renderizado de React:
montar componentes sería probar la librería.

No se persigue un porcentaje de cobertura: se persigue que **cada requisito evaluable del
enunciado tenga un test que lo demuestre** ([tabla de trazabilidad](#trazabilidad-requisito--test)).

Calidad:

```bash
docker compose exec backend ruff check . && docker compose exec backend ruff format --check .
docker compose exec backend mypy app
cd frontend && npm run lint && npm run typecheck && npm run build
```

Estas mismas comprobaciones corren en cada push en [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
un job de backend con un Postgres 16 real como servicio (los tests usan índices parciales,
`CHECK` y `SELECT ... FOR UPDATE`, así que probar contra SQLite probaría otra cosa) y otro de
frontend. El `build` del frontend es `tsc -b && vite build`, de modo que si el backend cambia un
campo y no se regeneró `schema.d.ts`, la CI lo detecta.

Y son las que **habilitan el despliegue**: el demo público solo se actualiza si todo esto pasa
([cómo funciona](#despliegue-cicd-en-un-vps-con-dokploy)).

---

## Despliegue: CI/CD en un VPS con Dokploy

`main` está siempre desplegado en <https://expoflores.jhongdlp.com>, y llega ahí solo. No hay
un paso manual ni una carpeta que alguien suba por SFTP.

```mermaid
flowchart LR
  P["push a main<br/>(o pull request)"] --> B
  P --> F
  B["CI · BACKEND<br/>ruff · ruff format<br/>mypy --strict<br/>pytest contra Postgres 16"]
  F["CI · FRONTEND<br/>oxlint · vitest<br/>tsc -b + vite build"]
  B --> G{"¿los dos<br/>en verde?"}
  F --> G
  G -- no --> X["no se despliega<br/>nada"]
  G -- "sí, y solo desde main" --> D["POST /api/compose.deploy<br/>a Dokploy"]
  D --> V["VPS<br/>pull del commit + build<br/>alembic upgrade + seed"]
  V --> W["expoflores.jhongdlp.com"]
```

**El deploy es un job más del pipeline, con `needs: [backend, frontend]`.** No es un webhook que
Dokploy dispare por su cuenta al detectar un push: si `ruff`, `mypy`, `pytest`, `oxlint`,
`vitest` o el `tsc` fallan, el job de deploy ni siquiera arranca y el demo sigue sirviendo el
último commit sano. La condición `github.ref == 'refs/heads/main' && github.event_name ==
'push'` hace además que un pull request corra toda la CI **sin** desplegar nada.

**Dokploy reconstruye el stack completo del `docker-compose.yml` del repositorio.** Por eso el
demo y su máquina corren exactamente lo mismo: el arranque del backend es
`alembic upgrade head && python -m app.seed && uvicorn …`, y como ambos pasos son idempotentes,
cada deploy migra lo que falte y deja el seed en su sitio sin duplicar ni pisar datos. Un
esquema nuevo llega solo con la migración; no hay que entrar por SSH a correr nada.

**Un solo origen para el navegador.** En producción nginx sirve el bundle de Vite y hace de
proxy de `/api/` hacia el backend (`frontend/nginx.conf`). Consecuencias: no hay CORS que
configurar, no hay una URL de API absoluta compilada dentro del bundle —así que la misma imagen
sirve en cualquier dominio— y el `index.html` va con `Cache-Control: no-cache` mientras los
assets con hash de Vite se cachean un año, de modo que un deploy nunca deja a nadie con un
bundle viejo.

**Los secretos no están en el repositorio.** `SECRET_KEY`, las credenciales SMTP y las de la
base viven en el entorno del despliegue; el token de la API de Dokploy y el id del stack, en los
*secrets* del repositorio (`DOKPLOY_API_TOKEN`, `DOKPLOY_COMPOSE_ID`, `DOKPLOY_HOST`). Lo
versionado es `.env.example`, con valores de demo.

| Pieza | Dónde |
|---|---|
| Pipeline completo | [`.github/workflows/ci.yml`](.github/workflows/ci.yml) |
| Servicios y arranque | [`docker-compose.yml`](docker-compose.yml) |
| Nginx: SPA, proxy y caché | [`frontend/nginx.conf`](frontend/nginx.conf) |
| Variables esperadas | [`.env.example`](.env.example) |

Por qué Dokploy y no un `git push` a un PaaS: el VPS ya existía, el proyecto son tres
contenedores que ya están descritos en un Compose, y Dokploy da HTTPS con renovación automática
y despliegue por API sin que haya que aprender un formato de manifiesto nuevo. La alternativa
—una acción que entre por SSH y haga `docker compose pull && up -d`— habría funcionado, pero
obliga a guardar una clave SSH del servidor en GitHub; un token revocable con un único permiso
es menos superficie.

---

## Cambiar las reglas sin tocar código

Este es el punto que el enunciado dice explícitamente que se evalúa. Las dos tablas de
configuración son `stand_size_rules` (rangos de metraje) y `credential_rules` (cuotas y
criterio de redondeo). El motor de reglas las recibe **como parámetro** y no las cachea: el
cambio surte efecto en la siguiente petición, sin reiniciar ni redesplegar nada.

```bash
docker compose exec db psql -U expoflores -d expoflores
```

```sql
-- Ampliar el rango "Grande" hasta 80 m² en el evento 1
UPDATE stand_size_rules SET max_m2 = 80
 WHERE event_id = 1 AND label = 'Grande';

-- Que los invitados se redondeen hacia arriba en vez de hacia abajo
UPDATE credential_rules SET rounding_mode = 'ceil'
 WHERE event_id = 1 AND category = 'Guest';

-- Subir la cuota de Exhibitor a 3 credenciales por cada 5 m²
UPDATE credential_rules SET credentials_per_block = 3
 WHERE event_id = 1 AND category = 'Exhibitor';
```

Recargue el panel del administrador: la categoría de los stands y las cuotas ya son otras.
El test `test_changing_range_changes_classification` demuestra exactamente esto sin tocar una
línea de código.

**Compruébelo en pantalla.** El administrador tiene una sección **Reglas** (`/admin/reglas`)
que muestra las dos tablas de configuración tal como están en la base, más un **simulador**:
escriba un metraje y verá su categoría y su cuota por categoría de credencial. La derivación
la hace el servidor (`GET /rules/quota?m2=…`) reusando la misma función que calcula la cuota de
un expositor real, así que el simulador no puede discrepar del alta. Corra cualquiera de los
`UPDATE` de arriba, recargue esa pantalla, y los números cambian sin recompilar ni reiniciar.

Una feria nueva es una fila en `events` con su propio juego de reglas. Los datos de una edición
no se ven desde otra.

---

## Reglas de negocio vigentes

Estos números son el contenido del seed, **no** están escritos en la lógica.

**Clasificación del stand por metraje** — informativa y de validación de rango: no interviene
en el cálculo de la cuota.

| Categoría | Rango (m², ambos extremos incluidos) |
|---|---|
| Pequeño | 5 – 12 |
| Mediano | 13 – 30 |
| Grande | 31 – 50 |

Un metraje fuera de `[5, 50]` se rechaza con `STAND_SIZE_OUT_OF_RANGE` en vez de clasificarse
por aproximación.

**Cuota de credenciales** — `cuota = credentials_per_block × redondeo(m² / block_m2)`.

| Categoría | Regla | `credentials_per_block` | `block_m2` | `rounding_mode` |
|---|---|---|---|---|
| `Exhibitor` | 2 por cada 5 m² | 2 | 5 | `floor` |
| `Guest` | 2 por cada 10 m² | 2 | 10 | `floor` |
| `Service` | 3 por cada 10 m² | 3 | 10 | `floor` |

Con `floor`, un stand de 25 m² tiene 10 credenciales `Exhibitor`, 4 `Guest` y 6 `Service`; uno
de 5–9 m² tiene 0 `Guest` y 0 `Service`, que es la lectura literal de la regla.

**Validación crítica.** Una misma identificación no puede estar registrada por dos empresas en
el mismo evento. Está protegida en dos capas —`UNIQUE(event_id, identification)` en la base y
verificación en el servicio— y ambas producen **exactamente el mismo error**, con el nombre de
la empresa que ya registró a esa persona en `details.registered_in`. La pantalla lo muestra
como un bloque persistente, no como un aviso que se desvanece.

---

## Decisiones que sostienen la entrega

Las ocho ambigüedades del enunciado y su resolución están en
[`docs/decisiones.md`](docs/decisiones.md). Las cuatro decisiones estructurales tienen ADR:

| ADR | Decisión |
|---|---|
| [0001](docs/adr/0001-scope-por-evento.md) | Scope por evento en todo el modelo y en todo repositorio |
| [0002](docs/adr/0002-reglas-en-base-de-datos.md) | Las reglas viven en tablas y llegan al motor como parámetro |
| [0003](docs/adr/0003-token-set-password.md) | Token de un solo uso para establecer la contraseña |
| [0004](docs/adr/0004-criterio-de-redondeo.md) | Criterio de redondeo `floor`, parametrizado por fila |

Tres piezas que conviene mirar en el código:

**El cupo se verifica dentro de la transacción, con bloqueo de fila.** Sin el
`SELECT … FOR UPDATE` sobre la fila del expositor, dos altas simultáneas sobre la última
credencial disponible pasan **ambas** la verificación y el stand acaba con una credencial de
más. La comprobación y el `INSERT` viven en la misma transacción
(`app/services/participant_service.py`), y la carga masiva reutiliza ese mismo servicio
verificando el **lote completo** de una vez, no fila a fila.

**Un recurso ajeno responde 404, no 403.** El `exhibitor_id` y el `event_id` con los que se
filtra cualquier consulta del representante salen del claim del JWT; no existe ningún endpoint
del representante que acepte un id de empresa. Si pide un participante de otra empresa, el
repositorio no lo encuentra y la respuesta es 404: no se confirma que el recurso exista.

**Todo error sale con la misma forma**, `{code, message, details}`, con `code` estable. El
frontend decide qué pintar por `code`, nunca por el texto del mensaje, y ningún stack trace ni
detalle interno llega al cliente: eso va al log estructurado con su `request_id`.

---

## Trazabilidad: requisito → test

| # | Requisito del enunciado | Test |
|---|---|---|
| R1 | Clasificación por metraje (5–12 / 13–30 / 31–50) | `unit/test_rules.py::test_classify_boundaries` |
| R2 | Metrajes fuera de rango | `unit/test_rules.py::test_classify_out_of_range` |
| R3 | Cuota Exhibitor: 2 por cada 5 m² | `unit/test_rules.py::test_quota_exhibitor` |
| R4 | Cuota Guest: 2 por cada 10 m² | `unit/test_rules.py::test_quota_guest` |
| R5 | Cuota Service: 3 por cada 10 m² | `unit/test_rules.py::test_quota_service` |
| R6 | Criterio de redondeo | `unit/test_rules.py::test_quota_rounding_floor` |
| **R7** | **Rangos parametrizados, no quemados** | `integration/test_rules_parametrization.py::test_changing_range_changes_classification` |
| R8 | Una persona no puede estar en dos empresas del mismo evento | `integration/test_participants.py::test_duplicate_identification_same_event` |
| R9 | Aislamiento entre ediciones de la feria | `integration/test_participants.py::test_same_identification_different_events_allowed` |
| R10 | No exceder el cupo | `integration/test_participants.py::test_quota_exceeded` |
| R11 | El representante solo ve lo suyo (IDOR) | `integration/test_authz.py::test_representative_cannot_read_other_exhibitor` |
| R12 | El alta de expositor crea el usuario del representante | `integration/test_exhibitors.py::test_create_exhibitor_creates_user` |
| R13 | Consistencia al corregir el metraje | `integration/test_exhibitors.py::test_reduce_m2_below_assigned_is_blocked` |
| R14 | Carga masiva validada fila por fila | `integration/test_bulk_upload.py::test_invalid_rows_report_and_no_inserts` |
| R15 | El error de login no filtra información | `integration/test_auth.py::test_login_generic_error` |
| R16 | Cédula y RUC validados con el algoritmo real | `unit/test_identification.py::test_cedula_modulo10`, `::test_ruc_modulo11` |
| R17 | "Empresa proveedora" obligatoria solo en `Service` | `integration/test_participants.py::test_provider_company_required_for_service` · `frontend/src/features/participants/schema.test.ts` |
| R18 | Al menos un contacto adicional | `integration/test_exhibitors.py::test_at_least_one_contact_required` |
| E1 | Los dos correos del punto extra | `integration/test_emails.py::test_exhibitor_creation_sends_setup_link`, `::test_participant_with_email_is_notified`, `::test_participant_without_email_does_not_fail` |
| E1b | Un fallo del mailer no aborta la operación | `integration/test_emails.py::test_mailer_failure_does_not_rollback` |
| E2 | Carga masiva desde Excel | cubierto por R14 y `test_dry_run_inserts_nothing`; la lectura en el navegador, `frontend/src/features/bulk-upload/preview.test.ts` |
| E3 | Parametrización | cubierto por R7, más `test_quota_simulator_follows_the_rules_in_the_database` (la pantalla `/admin/reglas`) |

---

## Estructura del repositorio

```
backend/
  app/
    routers/        HTTP: esquema y códigos de estado. Sin lógica de negocio.
    services/       Reglas de negocio, transacciones, orquestación.
    repositories/   Acceso a datos, siempre con event_id. Sin reglas de negocio.
    domain/         Motor de reglas y validación de identificación. Módulos PUROS:
                    sin SQLAlchemy, sin FastAPI, testeables sin base de datos.
    integrations/   Excel (openpyxl) y correo (SMTP).
    core/           Configuración, seguridad/JWT, logging, traducción de errores.
  tests/unit/       Reglas e identificación, sin base.
  tests/integration/ API contra una base de test.
frontend/src/
  api/              Cliente HTTP y tipos generados desde OpenAPI.
  features/         auth, exhibitors, participants, dashboard, bulk-upload.
  components/       Piezas de interfaz compartidas.
docs/
  adr/              Cuatro decisiones estructurales.
  decisiones.md     Las ocho ambigüedades del enunciado.
  presentacion.pdf  Presentación de 5 páginas (propuesta, decisiones, reglas, capturas).
  der.png           Diagrama entidad-relación.
  casos-de-uso.png  Casos de uso por rol.
  capturas/         Capturas de la aplicación.
datos_de_mocks/     Excel de ejemplo para la carga masiva, válidos y con errores.
.github/workflows/  CI (lint, tipos, tests) y despliegue automático a Dokploy.
scripts/            Capturas con Playwright, generación del PDF y empaquetado del ZIP.
```

La dependencia entre capas es unidireccional: un router nunca consulta la base, un repositorio
nunca decide nada de negocio.

---

## API

Prefijo `/api/v1`. El esquema completo está en <http://localhost:8000/docs>.

| Método | Ruta | Rol | Qué hace |
|---|---|---|---|
| POST | `/auth/login` | público | Devuelve el JWT. Limitado a 5 intentos por minuto y por IP. |
| POST | `/auth/set-password` | público (token) | Consume el token de un solo uso. |
| POST | `/auth/request-password-setup` | admin | Reenvía el enlace de acceso. |
| GET | `/auth/me` | ambos | Usuario y contexto de la sesión. |
| GET/POST | `/exhibitors` | admin | Listado paginado con cuota derivada · alta atómica. |
| GET/PATCH/DELETE | `/exhibitors/{id}` | admin | Detalle · corrección de metraje · borrado lógico. |
| GET | `/participants` | admin | Todas las credenciales de la feria, paginadas. |
| GET | `/dashboard/admin` | admin | Asignadas vs. disponibles por stand. |
| GET | `/reports/exhibitors.xlsx` | admin | Reporte en Excel. |
| GET | `/me/exhibitor` · `/me/quota` | representante | Su empresa y su cupo por categoría. |
| GET/POST | `/me/participants` | representante | Sus credenciales · alta manual. |
| PATCH/DELETE | `/me/participants/{id}` | representante | 404 si no es suya. |
| POST | `/me/participants/bulk?dry_run=` | representante | Carga masiva. `dry_run=true` valida sin insertar. |
| GET | `/me/participants/template.xlsx` | representante | Plantilla de carga. |
| GET | `/rules/stand-sizes` · `/rules/credentials` | ambos | Reglas vigentes del evento. |
| GET | `/rules/quota?m2=` | ambos | Deriva categoría y cuota de un metraje con las reglas vigentes. No persiste nada. |
| GET | `/health` | público | Verifica la base con `SELECT 1`. |

`bulk` es **un solo endpoint**: el preview y la confirmación recorren exactamente el mismo
código de validación, y lo único que cambia es si hay `COMMIT`. Un archivo con una sola fila
inválida no inserta ninguna.
