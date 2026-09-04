# 🚀 DevOps, Infraestructura y Pipeline CI/CD
## Sistema de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** DOC-08-OPS-CICD
- **Estándar:** arc42 Sección 7 / ISO/IEC 25010 (Operabilidad y Fiabilidad)
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## 1. Topología de Infraestructura (Docker Compose)

El sistema se despliega mediante una configuración contenerizada autónoma y reproducible:

```mermaid
flowchart TD
    Host["🌐 Servidor Host"]

    subgraph DockerCompose["🐳 Entorno Docker Compose"]
        direction TB
        
        Nginx["<b>frontend (Nginx)</b><br/>Sirve build estático de React<br/><code>Host: 5173 ➔ Contenedor: 80</code>"]
        
        FastAPI["<b>backend (FastAPI / Uvicorn)</b><br/>API REST y Swagger Docs<br/><code>Host: 8000 ➔ Contenedor: 8000</code><br/><i>Entrypoint: alembic upgrade + seed + uvicorn</i>"]
        
        DB[("<b>db (PostgreSQL 16 Alpine)</b><br/>Sin puertos expuestos al host<br/><code>Healthcheck pg_isready cada 3s</code>")]
        
        Vol[("💾 Volumen Persistente: pgdata")]
    end

    Host -->|HTTP:5173| Nginx
    Host -->|HTTP:8000| FastAPI
    Nginx -.->|Peticiones API| FastAPI
    FastAPI -->|depends_on: service_healthy| DB
    DB --- Vol

    style Nginx fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style FastAPI fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style DB fill:#e3ece6,stroke:#1b3a30,stroke-width:1.5px
```

### Especificación de Servicios:

| Servicio | Imagen Base | Puertos Expuestos | Variables de Entorno Clave |
| :--- | :--- | :---: | :--- |
| **`db`** | `postgres:16-alpine` | Interno (5432) | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` |
| **`backend`** | `python:3.12-slim` | `8000:8000` | `DATABASE_URL`, `JWT_SECRET_KEY`, `MAIL_SERVER`, `MAIL_PORT` |
| **`frontend`** | `nginx:alpine` | `5173:80` | `VITE_API_BASE_URL` |

---

## 2. Healthcheck y Orquestación Resiliente

Para evitar errores de conexión al arrancar el backend antes de que PostgreSQL acepte conexiones, se implementa una sonda de salud (*Healthcheck*) con dependencia condicional:

```yaml
services:
  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U expoflores -d expoflores"]
      interval: 3s
      timeout: 3s
      retries: 5

  backend:
    build: ./backend
    depends_on:
      db:
        condition: service_healthy
```

---

## 3. Pipeline de Integración Continua (GitHub Actions CI/CD)

El pipeline de CI se dispara en cada `push` o `pull_request` sobre la rama `main`, garantizando que ningún cambio degrade la calidad del código:

```mermaid
flowchart LR
    Push["Git Push / PR (main)"] --> Actions["GitHub Actions CI"]

    subgraph JobBackend["Job: Backend (Python 3.12)"]
        B_DB["Service: PostgreSQL 16"]
        B_Lint["1. Ruff Lint & Format"]
        B_Type["2. Mypy --strict"]
        B_Test["3. Pytest (205 tests contra DB real)"]
        B_DB --> B_Test
        B_Lint --> B_Type
        B_Type --> B_Test
    end

    subgraph JobFrontend["Job: Frontend (Node 22)"]
        F_Lint["1. Oxlint"]
        F_Test["2. Vitest Suite (33 tests)"]
        F_Build["3. TypeScript (tsc -b) & Vite Build"]
        F_Lint --> F_Test
        F_Test --> F_Build
    end

    Actions --> JobBackend
    Actions --> JobFrontend

    JobBackend --> Status["✅ CI Passed (Badge Verde)"]
    JobFrontend --> Status

    style JobBackend fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style JobFrontend fill:#fbf1f5,stroke:#a83a63,stroke-width:1.5px
    style Status fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

---

## 4. Comandos Operativos de Gestión

```bash
# 1. Levantar el entorno completo en segundo plano
docker compose up -d --build

# 2. Monitorear logs en tiempo real
docker compose logs -f backend

# 3. Ejecutar suite de pruebas en el contenedor de backend
docker compose exec backend pytest -v

# 4. Detener y limpiar contenedores preservando datos
docker compose down

# 5. Reiniciar borrando base de datos (Reset total)
docker compose down -v
docker compose up -d --build
```
