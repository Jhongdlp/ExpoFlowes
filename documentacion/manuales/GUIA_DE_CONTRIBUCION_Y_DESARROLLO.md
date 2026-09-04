# 💻 Guía de Desarrollo, Contribución y Onboarding Técnico
## Plataforma de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** DEV-GUIDE-05
- **Audiencia:** Ingenieros de Software, Desarrolladores Fullstack y Testers de Calidad (QA)
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## 1. Puesta en Marcha del Entorno Local (*Quickstart*)

### 1.1. Prerrequisitos
- **Node.js:** v22.x o superior con `npm` v10+.
- **Python:** v3.12.x con `poetry` o entorno virtual estándar.
- **Docker & Docker Compose:** Para la base de datos PostgreSQL local.

---

### 1.2. Paso a Paso para Levantar el Proyecto

#### 1. Iniciar la Base de Datos PostgreSQL
```bash
docker compose up -d db
```

#### 2. Configuración y Ejecución del Backend (FastAPI)
```bash
cd backend

# Instalar dependencias con Poetry
poetry install

# Ejecutar migraciones de Alembic
poetry run alembic upgrade head

# Poblar datos iniciales de prueba (Eventos, reglas y expositores)
poetry run python -m app.scripts.seed_data

# Iniciar servidor de desarrollo con recarga automática
poetry run uvicorn app.main:app --reload --port 8000
```
La documentación Swagger estará disponible en: `http://localhost:8000/docs`.

#### 3. Configuración y Ejecución del Frontend (React + Vite)
```bash
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite
npm run dev
```
La aplicación web estará disponible en: `http://localhost:5173`.

---

## 2. Ejecución de Pruebas Automatizadas y Calidad de Código

### 2.1. Backend (Python)
```bash
cd backend

# 1. Ejecutar toda la suite de pruebas (205 tests)
poetry run pytest -v

# 2. Análisis estático y formateo con Ruff
poetry run ruff check app tests
poetry run ruff format app tests

# 3. Verificación estricta de tipos con Mypy
poetry run mypy --strict app
```

### 2.2. Frontend (TypeScript / React)
```bash
cd frontend

# 1. Ejecutar suite de pruebas con Vitest (33 tests)
npm test

# 2. Verificación de tipos TypeScript
npm run typecheck

# 3. Linting ultrarrápido con Oxlint
npm run lint

# 4. Compilación de producción
npm run build
```

---

## 3. Sincronización Automática de Tipos API (`openapi-typescript`)

Cuando se modifique un router, modelo o esquema en FastAPI:
1. Asegúrese de que el backend esté corriendo en el puerto 8000.
2. Ejecute en la carpeta `frontend/`:
   ```bash
   npm run gen:api
   ```
3. Esto regenerará el archivo [`src/api/schema.d.ts`](file:///home/jhon/Documentos/Expoflores/frontend/src/api/schema.d.ts) con las definiciones TypeScript exactas del backend, garantizando tipado estático de punta a punta.

---

## 4. Convenciones de Git y Flujo de Trabajo

### 4.1. Formato de Commits (*Conventional Commits*)
Los mensajes de commit deben seguir el estándar semántico:

```
<tipo>(<ámbito>): <descripción corta en infinitivo>

[cuerpo opcional explicando el porqué del cambio]
```

- `feat(participants)`: Añade soporte para exportación en formato CSV.
- `fix(rules)`: Corrige desempate aritmético en modo de redondeo `round`.
- `docs(adr)`: Registra ADR-0006 para la integración con pasarelas de pago.
- `test(concurrency)`: Añade caso de estrés con 50 hilos concurrentes.
- `refactor(auth)`: Desacopla la lógica de hashing a un módulo utilitario.

### 4.2. Estrategia de Ramas (*Git Branching*)
- `main`: Rama de producción protegida (requiere CI verde).
- `develop`: Rama de integración para nuevas características.
- `feature/<nombre>`: Ramas de trabajo individuales para nuevas funcionalidades.
- `hotfix/<nombre>`: Correcciones críticas urgentes para producción.
