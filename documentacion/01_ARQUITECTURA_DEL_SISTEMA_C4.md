# 🏛️ Documento de Arquitectura de Software (Modelo C4 & Capas)
## Sistema de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** DOC-01-ARQ-C4
- **Estándar:** ISO/IEC/IEEE 42010:2011 / arc42 Sección 3, 4 y 5
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## 1. Visión General y Principios de Arquitectura

La arquitectura de **Expo Flor Ecuador** ha sido diseñada bajo los principios de **Clean Architecture (Arquitectura Limpia)**, **Separation of Concerns (SoC)** y **Zero-Trust Multi-Tenancy**. El sistema desacopla estrictamente las reglas de negocio de los detalles de infraestructura y protocolos de transporte.

### Principios Rectores:
1. **Dominio Puro sin Dependencias:** La capa de dominio (`app/domain`) no tiene dependencias de librerías externas (ni FastAPI, ni SQLAlchemy, ni Pydantic). Contiene únicamente lógica pura de Python, reglas matemáticas y algoritmos de validación deterministas.
2. **Aislamiento Multi-Tenant Forzado en Repositorios:** Todas las consultas y mutaciones de datos heredan de `EventScopedRepository(db, event_id)`, inyectando de forma forzada el filtro `event_id` en todas las sentencias SQL.
3. **Control Transaccional Centralizado:** La sesión de base de datos se maneja mediante inyección de dependencias (`Depends(get_db)`), garantizando transacciones atómicas con *commit* explícito y *rollback* ante excepciones.
4. **Desacoplamiento Frontend/Backend:** Comunicación estricta mediante API REST sin estado (*Stateless*), autenticación por tokens JWT Bearer y tipado estático compartido generado desde OpenAPI.

---

## 2. Diagrama C4 Nivel 1: Contexto del Sistema

El siguiente diagrama ilustra los usuarios principales, las fronteras del sistema y los servicios externos involucrados:

```mermaid
flowchart TD
    subgraph Users["👤 Actores del Sistema"]
        Admin["<b>Administrador de Feria</b><br/>Gestión de ferias, stands y reglas"]
        Rep["<b>Representante de Stand</b><br/>Gestión de stand y acreditación"]
        Part["<b>Participante / Acreditado</b><br/>Personal con credencial"]
    end

    subgraph Core["🏢 Sistema Central: Expo Flor Platform"]
        App["<b>Plataforma Expo Flor</b><br/>FastAPI · PostgreSQL · React<br/><i>Aislamiento multi-tenant por event_id</i>"]
    end

    subgraph Ext["📬 Servicios Externos"]
        SMTP["<b>Servicio SMTP / Mailtrap</b><br/>Envío de invitaciones y credenciales"]
    end

    Admin -->|HTTPS / REST + JWT| App
    Rep -->|HTTPS / REST + JWT| App
    App -->|SMTP transaccional| SMTP
    SMTP -.->|Enlace de activación 72h| Rep
    SMTP -.->|Confirmación de credencial| Part

    style App fill:#edf3f0,stroke:#1b3a30,stroke-width:2px,color:#1b3a30
    style SMTP fill:#fbf1f5,stroke:#a83a63,stroke-width:1.5px,color:#1b3a30
```

### Descripción de Actores y Sistemas:
- **Administrador de Feria:** Usuario con privilegios globales. Configura parámetros de la feria, rangos de metraje, factores de credenciales, registra expositores y monitorea métricas de ocupación en tiempo real.
- **Representante de Stand:** Usuario delegado por una empresa expositora. Recibe un enlace de invitación temporal (72h), activa su cuenta y administra sus cupos acreditando personal de forma manual o mediante importación XLSX.
- **Participante / Acreditado:** Receptor final de la credencial física o digital para ingresar a la feria.
- **Servicio SMTP:** Pasarela de mensajería para entrega transaccional asíncrona de invitaciones y credenciales de acceso.

---

## 3. Diagrama C4 Nivel 2: Contenedores del Sistema

El sistema se orquesta mediante contenedores Docker aislados en una red privada virtual:

```mermaid
flowchart LR
    User["👤 <b>Usuario</b><br/>Navegador Web"]

    subgraph Docker["🐳 Entorno Docker Compose"]
        direction TB
        Frontend["🖥️ <b>Frontend SPA</b><br/>React 18 · Vite · TS · TanStack<br/><code>Host: 5173 / Contenedor: 80</code>"]
        Backend["⚙️ <b>Backend API</b><br/>Python 3.12 · FastAPI · Pydantic v2<br/><code>Host: 8000 / Contenedor: 8000</code>"]
        DB[("🗄️ <b>Base de Datos</b><br/>PostgreSQL 16 Alpine<br/><code>Red interna aislada (5432)</code>")]
    end

    SMTP["📬 <b>SMTP Mailtrap</b><br/>Notificaciones"]

    User -->|HTTP / HTTPS| Frontend
    Frontend -->|JSON REST + JWT Bearer| Backend
    Backend -->|SQL / SELECT FOR UPDATE| DB
    Backend -->|SMTP / TLS| SMTP

    style Frontend fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style Backend fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style DB fill:#e3ece6,stroke:#1b3a30,stroke-width:1.5px
    style SMTP fill:#fbf1f5,stroke:#a83a63,stroke-width:1.5px
```

### Especificación de Contenedores:
1. **Frontend SPA (Nginx / React 19):**
   - Sirve la aplicación cliente precompilada en Vite.
   - Aplica enrutamiento del lado del cliente (`react-router-dom`), manejo de estado y validación previa de archivos Excel en memoria del navegador mediante SheetJS.
2. **Backend API (FastAPI / Uvicorn):**
   - Ejecuta la API REST en Python 3.12.
   - Entrypoint con migración automática de esquema (`alembic upgrade head`), inserción de datos iniciales (`seed_data.py`) y arranque de Uvicorn con 1 worker por contenedor.
3. **Base de Datos (PostgreSQL 16 Alpine):**
   - Motor relacional ACID con soporte para transacciones serializables, tipos de datos enriquecidos y volumen persistente (`pgdata`).
   - El puerto 5432 no se expone al host en entornos de producción, comunicándose exclusivamente a través de la red interna Docker `backend_net`.

---

## 4. Diagrama C4 Nivel 3: Componentes del Backend (Clean Architecture)

El Backend sigue un flujo unidireccional de dependencias estructurado en 5 capas concéntricas:

```mermaid
flowchart TD
    subgraph CapaAPI["1. Capa de Presentación (FastAPI Routers)"]
        R1["/auth (login, set-password)"]
        R2["/me (quota, participants, bulk)"]
        R3["/exhibitors · /rules · /participants"]
    end

    subgraph CapaServicios["2. Capa de Servicios de Negocio"]
        S1["auth_service.py"]
        S2["participant_service.py (lock pesimista)"]
        S3["exhibitor_service.py · dashboard_service.py"]
    end

    subgraph CapaDominio["3. Dominio Puro (Zero-Dependencies)"]
        D1["rules.py (classify_stand, quota_breakdown)"]
        D2["identification.py (validador cédula/RUC)"]
        D3["exceptions.py (DomainError tipados)"]
    end

    subgraph CapaRepos["4. Repositorios (Scope Forzado event_id)"]
        Base["EventScopedRepository (db, event_id)"]
        Repos["UserRepository · ParticipantRepository<br/>ExhibitorRepository · RulesRepository"]
    end

    subgraph CapaBD["5. Base de Datos"]
        ORM["SQLAlchemy 2.0 (Mapped / mapped_column)"]
        PG[("PostgreSQL 16 Engine")]
    end

    CapaAPI --> CapaServicios
    CapaServicios --> CapaDominio
    CapaServicios --> CapaRepos
    CapaRepos --> Base
    CapaRepos --> ORM
    ORM --> PG

    style CapaDominio fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style CapaRepos fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
```

### Responsabilidades por Capa:

| Capa | Módulos | Responsabilidad Técnica |
| :--- | :--- | :--- |
| **1. Presentación (API Routers)** | `app/routers/` | Recepción de peticiones HTTP, parseo y validación de esquemas Pydantic v2, extracción de `AuthContext` desde JWT, mapeo de excepciones de dominio a respuestas RFC 7807. |
| **2. Servicios de Aplicación** | `app/services/` | Orquestación de casos de uso, coordinación de transacciones, invocación de algoritmos de dominio y despacho de tareas asíncronas (envío de correos). |
| **3. Dominio Puro** | `app/domain/` | Fórmulas matemáticas de cupos, algoritmos de módulo 10/11 para cédulas ecuatorianas y excepciones de negocio (`DomainError`). Código 100% aislado. |
| **4. Repositorios** | `app/repositories/` | Abstracción de persistencia con ámbito forzado por `event_id`. Adquisición de bloqueos pesimistas (`with_for_update()`) y consultas parametrizadas. |
| **5. Modelos ORM e Infraestructura** | `app/models/`, `app/core/` | Definiciones declarativas SQLAlchemy 2.0 (`Mapped`, `mapped_column`), migraciones Alembic, hashing de contraseñas y emisión de JWT. |

---

## 5. Diagrama UML de Clases de la Capa de Repositorios

Todos los repositorios heredan de `EventScopedRepository`, garantizando que ninguna consulta pueda escapar del contexto del evento activo:

```mermaid
classDiagram
    class EventScopedRepository {
        +Session db
        +int event_id
        +__init__(db, event_id)
    }

    class UserRepository {
        +get(user_id) User
        +get_by_email(email) User
        +add(user)
    }

    class ExhibitorRepository {
        +get(exhibitor_id) Exhibitor
        +list_active(page, size)
        +soft_delete(exhibitor)
    }

    class ParticipantRepository {
        +get(exhibitor_id, id) Participant
        +lock_exhibitor(exhibitor_id) Exhibitor
        +find_owner(identification)
        +count_by_category(exhibitor_id)
        +add(participant)
        +delete(participant)
    }

    class RulesRepository {
        +stand_sizes() List~StandSizeRule~
        +credentials() List~CredentialRule~
    }

    EventScopedRepository <|-- UserRepository
    EventScopedRepository <|-- ExhibitorRepository
    EventScopedRepository <|-- ParticipantRepository
    EventScopedRepository <|-- RulesRepository
```

### Implementación del Patrón Multi-Tenant en Repositorio:
```python
class EventScopedRepository:
    """Clase base que asegura el particionamiento lógico de datos."""
    def __init__(self, db: Session, event_id: int):
        if not event_id:
            raise ValueError("event_id is strictly required for scoping")
        self.db = db
        self.event_id = event_id
```

---

## 6. Flujo de Control de una Petición de Acreditación

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Representante (Cliente Web)
    participant Router as /me/participants (Router)
    participant Svc as ParticipantService
    participant Repo as ParticipantRepository
    participant Domain as rules.py (Dominio)
    participant DB as PostgreSQL (ACID)

    Rep->>Router: POST /me/participants { cédula, nombres, categoría }
    Router->>Router: Valida esquema Pydantic & JWT Claims
    Router->>Svc: register_participant(auth_ctx, payload)
    
    rect rgb(240, 248, 255)
        Note over Svc,DB: Transacción Atómica con Bloqueo
        Svc->>Repo: lock_exhibitor(exhibitor_id)
        Repo->>DB: SELECT * FROM exhibitors WHERE id = :id AND event_id = :event FOR UPDATE
        DB-->>Repo: Retorna fila bloqueada (Expositor)
        
        Svc->>Domain: calculate_available_quota(m2, rules, ocupados)
        Domain-->>Svc: Cupo disponible confirmado (> 0)
        
        Svc->>Domain: validate_ecuadorian_id(cédula)
        Domain-->>Svc: Cédula válida (Módulo 10 OK)
        
        Svc->>Repo: add(participant)
        Repo->>DB: INSERT INTO participants (...)
        Svc->>DB: COMMIT (Libera el lock pesimista)
    end
    
    Svc-->>Router: ParticipantRead DTO
    Router-->>Rep: 201 Created
```
