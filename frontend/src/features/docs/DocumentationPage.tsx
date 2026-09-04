import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MermaidDiagram } from '../../components/MermaidDiagram'
import { PageHeader } from '../../components/PageHeader'
import { cn } from '../../lib/cn'

/* ── Diagramas Mermaid Minimalistas (Estándar IEEE 1016 / arc42) ─────────── */

const C4_CONTEXT_CHART = `flowchart TD
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
`

const C4_CONTAINER_CHART = `flowchart LR
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
`

const BACKEND_LAYERS_CHART = `flowchart TD
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
`

const CLASS_DIAGRAM_CHART = `classDiagram
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
`

const STATE_PARTICIPANT_CHART = `stateDiagram-v2
    [*] --> NoRegistrado

    NoRegistrado --> Acreditado : POST /me/participants (Individual o Excel)
    note right of Acreditado
        SELECT FOR UPDATE (lock pesimista)
        Consume 1 cupo de la categoría
    end note

    Acreditado --> Notificado : Correo enviado (Post-commit asíncrono)
    Acreditado --> AcreditadoModificado : PATCH /me/participants/:id
    Notificado --> AcreditadoModificado : PATCH /me/participants/:id

    AcreditadoModificado --> Notificado : Email añadido posteriormente

    Acreditado --> Eliminado : DELETE /me/participants/:id
    Notificado --> Eliminado : DELETE /me/participants/:id
    AcreditadoModificado --> Eliminado : DELETE /me/participants/:id
    
    note right of Eliminado
        Borrado físico en DB:
        - Libera la identificación DNI
        - Libera 1 cupo para el stand
    end note

    Eliminado --> [*]
`

const STATE_TOKEN_CHART = `stateDiagram-v2
    [*] --> CuentaCreada : Admin registra expositor (password_hash = NULL)
    
    CuentaCreada --> TokenEmitido : issue_password_setup_token()<br/>token_hash = SHA256(token)<br/>expires_at = now() + 72h
    
    TokenEmitido --> EmailEnviado : Mailer envía link /establecer-clave?token=XYZ

    EmailEnviado --> CuentaActivada : Representante define clave<br/>POST /auth/set-password
    note right of CuentaActivada
        used_at = now()
        password_hash = bcrypt(clave)
        Usuario habilitado para login
    end note

    EmailEnviado --> TokenExpirado : Transcurren más de 72h sin uso
    TokenExpirado --> TokenEmitido : Admin reenvía invitación<br/>POST /auth/request-password-setup

    CuentaActivada --> [*]
`

const FRONTEND_TREE_CHART = `flowchart TD
    subgraph Root["AppRoutes.tsx (Enrutador Central)"]
        Public["Rutas Públicas: /login · /establecer-clave · /documentacion"]
        G_Admin["RequireRole('admin')"]
        G_Rep["RequireRole('representative')"]
    end

    subgraph Layout["AppLayout.tsx (Marco de la Aplicación)"]
        Banner["DemoBanner (Aviso permanente demo)"]
        Rail["NavRail (Navegación colapsable con morph)"]
        Act["ActivityLine (Hilo de actividad global)"]
        Main["Main Outlet"]
    end

    subgraph AdminViews["Vistas Admin"]
        ADash["AdminDashboardPage"]
        ExhList["ExhibitorListPage · ExhibitorDetailPage"]
        PartList["ParticipantListPage (Búsqueda global)"]
        Rules["RulesPage (Rangos m²)"]
    end

    subgraph RepViews["Vistas Stand"]
        SDash["StandDashboardPage (Cupos)"]
        MyPart["MyParticipantListPage · ParticipantCreatePage"]
        Bulk["BulkUploadPage (SheetJS Preview)"]
    end

    G_Admin --> Layout
    G_Rep --> Layout
    Layout --> Main
    Main --> AdminViews
    Main --> RepViews

    style Root fill:#edf3f0,stroke:#1b3a30,stroke-width:1.5px
    style Layout fill:#e3ece6,stroke:#1b3a30,stroke-width:1.5px
`

const FRONTEND_EXCEL_STATE_CHART = `stateDiagram-v2
    [*] --> Idle

    Idle --> ParseandoCliente : Archivo soltado en Dropzone
    ParseandoCliente --> ErrorCliente : Archivo corrupto o formato no XLSX
    ErrorCliente --> Idle : Reintentar

    ParseandoCliente --> ValidandoDryRun : Lectura SheetJS OK<br/>POST /me/participants/bulk?dry_run=true
    
    ValidandoDryRun --> VistaErrores : 422 Unprocessable Entity<br/>(Filas inválidas o DNI duplicado)
    VistaErrores --> Idle : Usuario corrige archivo en Excel

    ValidandoDryRun --> VistaPreviaVerde : 200 OK (0 insertados)<br/>Lote válido y cupo suficiente
    
    VistaPreviaVerde --> ImportandoDefinitivo : Clic en Confirmar e Importar<br/>POST /bulk?dry_run=false
    
    ImportandoDefinitivo --> ExitoFinal : 200 OK (N credenciales creadas)<br/>Invalida caché TanStack Query
    ExitoFinal --> [*]
`

const DEVOPS_DOCKER_CHART = `flowchart TD
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
`

const CICD_PIPELINE_CHART = `flowchart LR
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
        F_Test["2. Vitest Suite"]
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
`

const ERD_CHART = `erDiagram
    EVENTS ||--o{ STAND_SIZE_RULES : "configura"
    EVENTS ||--o{ CREDENTIAL_RULES : "configura"
    EVENTS ||--o{ EXHIBITORS : "aloja"
    EVENTS ||--o{ USERS : "autentica"
    EVENTS ||--o{ PARTICIPANTS : "acredita"

    EXHIBITORS ||--|| REPRESENTATIVES : "1:1 coordinador"
    EXHIBITORS ||--o{ EXHIBITOR_CONTACTS : "1:N contactos"
    EXHIBITORS ||--o{ USERS : "cuenta acceso"
    EXHIBITORS ||--o{ PARTICIPANTS : "consume cupo"

    USERS ||--o{ PASSWORD_SETUP_TOKENS : "emite"

    EVENTS {
        int id PK
        string slug UK
        string name
        int year
        boolean is_active
    }

    STAND_SIZE_RULES {
        int id PK
        int event_id FK
        string label "Modular, Isla..."
        int min_m2
        int max_m2
    }

    CREDENTIAL_RULES {
        int id PK
        int event_id FK
        string category "Exhibitor|Guest|Service"
        int credentials_per_block
        int block_m2
        string rounding_mode "floor|ceil|round"
    }

    EXHIBITORS {
        int id PK
        int event_id FK
        string tax_id "RUC/DNI único vivo"
        string legal_name
        int requested_m2 "Metraje stand"
        datetime deleted_at "Soft delete"
    }

    REPRESENTATIVES {
        int id PK
        int exhibitor_id FK,UK
        string full_name
        string email
        string phone
    }

    EXHIBITOR_CONTACTS {
        int id PK
        int exhibitor_id FK
        string name
        string email
    }

    USERS {
        int id PK
        int event_id FK
        int exhibitor_id FK "Null para admin"
        string email UK
        string password_hash "Bcrypt"
        string role "admin|representative"
    }

    PASSWORD_SETUP_TOKENS {
        int id PK
        int user_id FK
        string token_hash UK "SHA-256"
        datetime expires_at "72h TTL"
        datetime used_at
    }

    PARTICIPANTS {
        int id PK
        int event_id FK
        int exhibitor_id FK
        string identification UK "Único por evento"
        string first_name
        string last_name
        string category
        string provider_company "Si Service"
        string email
    }
`

const USE_CASE_CHART = `flowchart TD
    subgraph Actores["Actores"]
        Admin["👤 Administrador"]
        Rep["👤 Representante"]
    end

    subgraph AdminActions["Panel Organización"]
        A1["Gestión de Expositores"]
        A2["Configuración de Reglas (m²)"]
        A3["Dashboard Global & Reportes"]
        A4["Reenvío de Magic Links"]
    end

    subgraph RepActions["Panel de Stand"]
        R1["Establecer Contraseña (72h)"]
        R2["Consulta de Cupos & Métricas"]
        R3["Acreditación Individual"]
        R4["Carga Masiva Excel (Dry-Run)"]
        R5["Descarga de Plantilla XLSX"]
    end

    Admin --> A1 & A2 & A3 & A4
    Rep --> R1 & R2 & R3 & R4 & R5

    style AdminActions fill:#edf3f0,stroke:#86988f,stroke-width:1px
    style RepActions fill:#fbf1f5,stroke:#86988f,stroke-width:1px
`

const AUTH_SEQUENCE_CHART = `sequenceDiagram
    autonumber
    actor Cliente as Usuario / SPA
    participant Router as /auth/login
    participant Limiter as RateLimiter
    participant Svc as AuthService
    participant Sec as Security (Bcrypt)
    participant DB as PostgreSQL

    Cliente->>Router: POST /login { email, password }
    Router->>Limiter: Verifica tasa de peticiones (IP)
    Router->>Svc: authenticate(email, password)
    Svc->>DB: SELECT user WHERE email = :email AND event_id = :event
    
    alt Usuario inexistente o sin contraseña
        Svc->>Sec: verify_password(password, _DUMMY_HASH)
        Note over Sec: Tiempo constante (anti-timing)
        Svc-->>Cliente: 401 Unauthorized ("Credenciales inválidas")
    else Usuario válido
        Svc->>Sec: verify_password(password, user.hash)
        Svc->>Sec: create_access_token(AuthContext)
        Note over Sec: JWT con claims: sub, role, event_id, exhibitor_id
        Svc-->>Cliente: 200 OK { access_token }
    end
`

const ONBOARDING_SEQUENCE_CHART = `sequenceDiagram
    autonumber
    actor Admin as Administrador
    participant API as Backend FastAPI
    participant DB as PostgreSQL
    participant Mailer as SMTP Mailer
    actor Rep as Representante

    Admin->>API: POST /exhibitors (crear empresa + representante)
    API->>DB: INSERT exhibitor, representative, user (password=NULL)
    API->>DB: INSERT password_setup_token (SHA-256 hash, 72h)
    API->>Mailer: Enviar enlace: /establecer-clave?token=XYZ
    Mailer-->>Rep: 📧 Correo con enlace de activación

    Note over Rep,API: Activación de cuenta
    Rep->>API: POST /auth/set-password { token, password }
    API->>DB: Validar token (no expirado y used_at IS NULL)
    API->>DB: UPDATE user (password_hash=bcrypt), token (used_at=now)
    API-->>Rep: 204 No Content (Cuenta activada)
`

const PARTICIPANT_LOCK_CHART = `sequenceDiagram
    autonumber
    actor Rep as Representante
    participant API as Backend FastAPI
    participant Rules as Motor de Reglas
    participant DB as PostgreSQL
    participant Mailer as SMTP Mailer

    Rep->>API: POST /me/participants { cédula, nombre, categoría }
    Note over API: event_id y exhibitor_id salen del JWT

    rect rgb(240, 248, 255)
        Note over API,DB: Transacción con Bloqueo Pesimista
        API->>DB: SELECT * FROM exhibitors WHERE id = :id FOR UPDATE
        API->>Rules: Calcular cuota disponible (metraje vs reglas)
        API->>DB: Verificar unicidad de cédula en el evento
        API->>DB: INSERT INTO participants (...)
        API->>DB: COMMIT
    end

    opt Si tiene email
        API->>Mailer: Enviar credencial (Post-commit asíncrono)
    end
    API-->>Rep: 201 Created
`

const BULK_EXCEL_CHART = `sequenceDiagram
    autonumber
    actor Rep as Representante
    participant UI as Frontend (SheetJS)
    participant API as Backend (/me/participants/bulk)
    participant DB as PostgreSQL

    Rep->>UI: Arrastra archivo .xlsx
    UI->>UI: Validación local de columnas y formato

    Note over Rep,API: Fase 1: Vista Previa (Dry-Run)
    UI->>API: POST /bulk?dry_run=true
    API->>API: Validación Pydantic + Cédula ecuatoriana + Duplicados
    API->>DB: lock_exhibitor() + verificar cupo total del lote
    API-->>UI: 200 OK Reporte de Validación (0 insertados)
    UI-->>Rep: Muestra tabla verde de filas válidas

    Note over Rep,API: Fase 2: Confirmación Definitiva
    Rep->>UI: Clic en "Confirmar e Importar"
    UI->>API: POST /bulk?dry_run=false
    API->>DB: Transacción: lock_exhibitor() + bulk INSERT + COMMIT
    API-->>UI: 200 OK (N credenciales creadas)
`

const RULES_FLOW_CHART = `flowchart TD
    Start(["Metraje stand (m²)"]) --> Fetch["Consultar reglas activas del evento:<br/>• stand_size_rules<br/>• credential_rules"]
    
    Fetch --> Check{"¿m² dentro de rango?"}
    Check -- No --> Err["❌ Error: Metraje no configurado"]
    Check -- Sí --> Label["Asignar categoría de stand<br/>(Modular, Isla, etc.)"]

    Label --> Calc["Calcular bloques según rounding_mode:<br/>• floor: m² // block_m²<br/>• ceil: -(-m² // block_m²)<br/>• round: (2*m² + block) // (2*block)"]
    
    Calc --> Total["Cuota por categoría = bloques * credentials_per_block"]
    Total --> Done(["Cupo disponible = Cuota - Ocupados"])

    style Err fill:#fdf3f1,stroke:#9e2c20,stroke-width:1.5px,color:#9e2c20
    style Done fill:#edf3f0,stroke:#1b3a30,stroke-width:2px,color:#1b3a30
`

/* ── Vista Principal con Estándar Formal de Documentación (arc42 / IEEE 1016) */

type DocTab =
  | 'c4'
  | 'erd'
  | 'backend'
  | 'states'
  | 'frontend'
  | 'devops'
  | 'security'
  | 'adrs'
  | 'errors'
  | 'rules'

export function DocumentationPage() {
  const [activeTab, setActiveTab] = useState<DocTab>('c4')

  // Simulador interactivo en tiempo real
  const [simM2, setSimM2] = useState<number>(24)
  const [simRounding, setSimRounding] = useState<'floor' | 'ceil' | 'round'>('floor')

  const sizeRules = [
    { label: 'Stand Modular Pequeño', min: 5, max: 9 },
    { label: 'Stand Modular Mediano', min: 10, max: 19 },
    { label: 'Stand Esquinero / Isla Mediana', min: 20, max: 39 },
    { label: 'Gran Isla / Pabellón Premium', min: 40, max: 200 },
  ]

  const matchedRange = sizeRules.find((r) => simM2 >= r.min && simM2 <= r.max)

  const calcBlocks = (m2: number, blockM2: number, mode: 'floor' | 'ceil' | 'round') => {
    if (mode === 'floor') return Math.floor(m2 / blockM2)
    if (mode === 'ceil') return Math.ceil(m2 / blockM2)
    return Math.floor((2 * m2 + blockM2) / (2 * blockM2))
  }

  const exhibitorQuota = 4 * calcBlocks(simM2, 5, simRounding)
  const guestQuota = 2 * calcBlocks(simM2, 10, simRounding)
  const serviceQuota = 2 * calcBlocks(simM2, 10, simRounding)
  const totalQuota = exhibitorQuota + guestQuota + serviceQuota

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentación Técnica de Arquitectura"
        subtitle="Especificación formal según estándares ISO/IEC/IEEE 42010 y arc42. Incluye modelos C4, ERD, diccionario de datos, decisiones (ADRs), topología de errores y simulador de reglas."
        actions={
          <Link
            to="/login"
            className="rounded border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-fill transition-colors"
          >
            ← Volver al Login
          </Link>
        }
      />

      {/* Selector de Pestañas Estructuradas */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('c4')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'c4'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🏗️</span> C4 & Contexto
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('erd')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'erd'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🗄️</span> Modelo de Datos & Diccionario
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backend')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'backend'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>⚙️</span> Capas Backend & Clases
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('states')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'states'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🔄</span> Máquinas de Estado
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frontend')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'frontend'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🖥️</span> Arquitectura Frontend
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'security'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🔐</span> Seguridad & Concurrencia
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('adrs')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'adrs'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>📜</span> Decisiones (ADRs)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'errors'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🚨</span> Topología de Errores
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'rules'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🧮</span> Motor de Reglas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devops')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
            activeTab === 'devops'
              ? 'bg-ink text-white'
              : 'bg-surface text-ink hover:bg-fill border border-line',
          )}
        >
          <span>🚀</span> DevOps & Trazabilidad
        </button>
      </div>

      {/* ── 1. C4 & Contexto ─────────────────────────────────────────────── */}
      {activeTab === 'c4' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">1. Contexto de Sistema & Estrategia de Solución</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              La plataforma <strong>Expo Flor Ecuador</strong> es un sistema de acreditación multi-tenant diseñado para
              gestionar ferias internacionales de expositores florícolas. El diseño aísla completamente los datos entre
              ediciones anuales sin requerir bases de datos separadas, resolviendo el contexto del evento en cada petición a través de los claims criptográficos del token JWT.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[12px]">
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Aislamiento por Diseño</strong>
                <span className="text-ink-faint">Toda tabla operativa y consulta está acotada estrictamente por <code>event_id</code>.</span>
              </div>
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Zero-Hardcoding</strong>
                <span className="text-ink-faint">Rangos de metraje, cuotas y modos de redondeo viven en base de datos.</span>
              </div>
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Transaccionalidad Atómica</strong>
                <span className="text-ink-faint">Control de cupos con <code>SELECT FOR UPDATE</code> y cargas masivas todo-o-nada.</span>
              </div>
            </div>
          </div>

          <MermaidDiagram
            title="C4 Nivel 1: Diagrama de Contexto de Sistema"
            subtitle="Frontera de la plataforma, roles humanos (Admin, Representante, Acreditado) y servicio de mensajería SMTP."
            chart={C4_CONTEXT_CHART}
          />

          <MermaidDiagram
            title="C4 Nivel 2: Diagrama de Contenedores"
            subtitle="Topología Docker Compose: Frontend React 18, Backend FastAPI 3.12 y PostgreSQL 16 Alpine en red aislada."
            chart={C4_CONTAINER_CHART}
          />
        </section>
      )}

      {/* ── 2. Modelo de Datos & Diccionario ─────────────────────────────── */}
      {activeTab === 'erd' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">2. Modelo Entidad-Relación y Diccionario de Datos</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Esquema relacional en PostgreSQL 16. Implementa integridad referencial compuesta, claves foráneas con borrado en cascada
              e índices parciales para soft-delete seguro. Las cuotas y categorías son derivadas (no existen columnas estáticas de cupo).
            </p>
          </div>

          <MermaidDiagram
            title="Diagrama Entidad-Relación (ERD)"
            subtitle="Todas las entidades operativas asociadas a events mediante event_id obligatorio."
            chart={ERD_CHART}
          />

          {/* Diccionario de Datos Formal */}
          <div className="surface overflow-hidden">
            <div className="border-b border-line bg-fill px-4 py-3">
              <h4 className="text-[13px] font-semibold text-ink">Diccionario de Datos & Especificación de Entidades</h4>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint font-mono">
                    <th className="pb-2">Entidad / Campo</th>
                    <th className="pb-2">Tipo SQL</th>
                    <th className="pb-2">Nulable</th>
                    <th className="pb-2">Restricción / Regla de Validación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">events.slug</td>
                    <td className="py-2.5 font-mono">VARCHAR(80)</td>
                    <td className="py-2.5">No</td>
                    <td className="py-2.5">Identificador alfanumérico único global (ej: <code>expo-flor-2026</code>).</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">exhibitors.tax_id</td>
                    <td className="py-2.5 font-mono">VARCHAR(20)</td>
                    <td className="py-2.5">No</td>
                    <td className="py-2.5">Cédula/RUC ecuatoriano. Único por evento mediante índice parcial <code>WHERE deleted_at IS NULL</code>.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">exhibitors.requested_m2</td>
                    <td className="py-2.5 font-mono">INTEGER</td>
                    <td className="py-2.5">No</td>
                    <td className="py-2.5"><code>CHECK (requested_m2 &gt; 0)</code>. Base para el cálculo dinámico de cuotas.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">participants.identification</td>
                    <td className="py-2.5 font-mono">VARCHAR(20)</td>
                    <td className="py-2.5">No</td>
                    <td className="py-2.5">Validada con algoritmo Módulo 10/11. <code>UNIQUE(event_id, identification)</code>.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">participants.provider_company</td>
                    <td className="py-2.5 font-mono">VARCHAR(200)</td>
                    <td className="py-2.5">Condicional</td>
                    <td className="py-2.5"><code>CHECK ((category = 'Service') = (provider_company IS NOT NULL))</code>.</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-mono font-bold text-cat-exhibitor">password_setup_tokens.token_hash</td>
                    <td className="py-2.5 font-mono">VARCHAR(64)</td>
                    <td className="py-2.5">No</td>
                    <td className="py-2.5">Digest SHA-256 del token URL-safe de 32 bytes emitido. Caducidad 72h.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. Capas Backend & Clases ─────────────────────────────────────── */}
      {activeTab === 'backend' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">3. Arquitectura en Capas y Patrón Repositorio Scoped</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              El backend implementa una arquitectura hexagonal desacoplada donde el motor de cálculo en <code>app/domain/rules.py</code> es
              completamente puro (sin dependencias de frameworks ni I/O). El acceso a datos se centraliza en repositorios que heredan de
              <code>EventScopedRepository</code>, forzando la inyección del <code>event_id</code> validado desde el JWT en cada consulta.
            </p>
          </div>

          <MermaidDiagram
            title="Arquitectura de Capas de Software"
            subtitle="Flujo unidireccional: Routers ➔ Schemas ➔ Servicios ➔ Dominio Puro ➔ Repositorios ➔ ORM."
            chart={BACKEND_LAYERS_CHART}
          />

          <MermaidDiagram
            title="Diagrama de Clases UML: Jerarquía de Repositorios"
            subtitle="Extensión de EventScopedRepository garantizando que no existan métodos de listado sin scope de evento."
            chart={CLASS_DIAGRAM_CHART}
          />
        </section>
      )}

      {/* ── 4. Máquinas de Estado ────────────────────────────────────────── */}
      {activeTab === 'states' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">4. Máquinas de Estado Finitas (Statecharts UML)</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Modelado formal de los ciclos de vida de las entidades operativas del sistema: transiciones permitidas,
              eventos disparadores, efectos colaterales (como el envío asíncrono de correos) y restitución de cupos.
            </p>
          </div>

          <MermaidDiagram
            title="Ciclo de Vida de una Credencial (Participante)"
            subtitle="Estados desde el alta atómica hasta la notificación por correo y liberación de cupo en la eliminación."
            chart={STATE_PARTICIPANT_CHART}
          />

          <MermaidDiagram
            title="Ciclo de Vida de la Cuenta y Token de Setup (72h)"
            subtitle="Token criptográfico de un solo uso con hash SHA-256 en BD y activación de clave con Bcrypt."
            chart={STATE_TOKEN_CHART}
          />
        </section>
      )}

      {/* ── 5. Arquitectura Frontend ─────────────────────────────────────── */}
      {activeTab === 'frontend' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">5. Arquitectura del Frontend y Gestión de Estado</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Desarrollado en React 18 con TypeScript en modo estricto. Implementa TanStack Query para sincronización de caché reactiva,
              React Hook Form con validadores Zod, y lectura directa de hojas de cálculo Excel en el navegador mediante SheetJS.
            </p>
          </div>

          <MermaidDiagram
            title="Árbol de Componentes y Jerarquía de Rutas"
            subtitle="AppRoutes con Route Guards por rol (admin/representative), marco AppLayout y vistas principales."
            chart={FRONTEND_TREE_CHART}
          />

          <MermaidDiagram
            title="Statechart: Flujo de Carga Masiva (Excel)"
            subtitle="Parsing en cliente con SheetJS ➔ Validación Dry-Run en Backend ➔ Preview de Filas ➔ Inserción Atómica."
            chart={FRONTEND_EXCEL_STATE_CHART}
          />
        </section>
      )}

      {/* ── 6. Seguridad & Concurrencia ───────────────────────────────────── */}
      {activeTab === 'security' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">6. Seguridad, Concurrencia y Modelo de Amenazas (STRIDE)</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Mecanismos de defensa en profundidad implementados en el núcleo del sistema:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[12px]">
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Mitigación de Timing Attacks</strong>
                <span className="text-ink-faint">En <code>/auth/login</code>, usuarios inexistentes calculan bcrypt contra <code>_DUMMY_HASH</code> para tardar el mismo tiempo.</span>
              </div>
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Prevención de IDOR por Diseño</strong>
                <span className="text-ink-faint">Ningún ID de evento o stand se recibe por URL o body; se extraen directamente del JWT verificado.</span>
              </div>
              <div className="rounded border border-line bg-fill p-3">
                <strong className="block text-ink">Bloqueo Pesimista Concurrente</strong>
                <span className="text-ink-faint"><code>SELECT ... FOR UPDATE</code> sobre la fila del expositor evita condiciones de carrera en el consumo de cupos.</span>
              </div>
            </div>
          </div>

          <MermaidDiagram
            title="Casos de Uso del Sistema (RBAC)"
            subtitle="Matriz de control de acceso basada en roles: Administrador de Organización vs Representante de Stand."
            chart={USE_CASE_CHART}
          />

          <MermaidDiagram
            title="Secuencia: Autenticación con Prevención de Timing Attacks"
            subtitle="Verificación contra _DUMMY_HASH y emisión de JWT HS256 con claims estructurados."
            chart={AUTH_SEQUENCE_CHART}
          />

          <MermaidDiagram
            title="Secuencia: Onboarding con Magic Link"
            subtitle="Token URL-safe emitido una sola vez y validado contra su hash SHA-256 en base de datos."
            chart={ONBOARDING_SEQUENCE_CHART}
          />

          <MermaidDiagram
            title="Secuencia: Acreditación con SELECT FOR UPDATE"
            subtitle="Bloqueo pesimista en PostgreSQL para garantizar consistencia transaccional en cuotas concurrentes."
            chart={PARTICIPANT_LOCK_CHART}
          />

          <MermaidDiagram
            title="Secuencia: Carga Masiva Excel (Dry-Run / Todo-o-Nada)"
            subtitle="Validación preliminar fila a fila y reporte estructurado antes del commit definitivo."
            chart={BULK_EXCEL_CHART}
          />
        </section>
      )}

      {/* ── 7. Decisiones de Arquitectura (ADRs) ─────────────────────────── */}
      {activeTab === 'adrs' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">7. Registros de Decisiones de Arquitectura (ADRs)</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Registro histórico de las decisiones clave de ingeniería, sus justificaciones, alternativas descartadas y trade-offs asumidos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12px]">
            {/* ADR 0001 */}
            <div className="surface p-4 space-y-2">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="font-mono font-bold text-brand">ADR-0001</span>
                <span className="rounded bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">Aceptada</span>
              </div>
              <h4 className="text-[13px] font-bold text-ink">Scope por evento en todo el modelo de datos</h4>
              <p className="text-ink-soft">
                <strong>Contexto:</strong> Evitar que consultas futuras mezclen datos de ferias distintas.
              </p>
              <p className="text-ink-soft">
                <strong>Decisión:</strong> Toda tabla operativa lleva <code>event_id</code> y todas las restricciones únicas son compuestas por evento.
              </p>
              <p className="text-ink-faint">
                <strong>Alternativa descartada:</strong> Base de datos por feria (desproporcionada para el MVP) o JOINs dinámicos.
              </p>
            </div>

            {/* ADR 0002 */}
            <div className="surface p-4 space-y-2">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="font-mono font-bold text-brand">ADR-0002</span>
                <span className="rounded bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">Aceptada</span>
              </div>
              <h4 className="text-[13px] font-bold text-ink">Reglas de metraje y cuotas en base de datos</h4>
              <p className="text-ink-soft">
                <strong>Contexto:</strong> El enunciado exige que las reglas sean modificables sin tocar código.
              </p>
              <p className="text-ink-soft">
                <strong>Decisión:</strong> Dos tablas de configuración (<code>stand_size_rules</code> y <code>credential_rules</code>). Cuotas derivadas con fórmulas parametrizadas.
              </p>
              <p className="text-ink-faint">
                <strong>Alternativa descartada:</strong> Constantes en Python o archivos JSON/YAML no transaccionales.
              </p>
            </div>

            {/* ADR 0003 */}
            <div className="surface p-4 space-y-2">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="font-mono font-bold text-brand">ADR-0003</span>
                <span className="rounded bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">Aceptada</span>
              </div>
              <h4 className="text-[13px] font-bold text-ink">Tokens de activación de 72h hasheados con SHA-256</h4>
              <p className="text-ink-soft">
                <strong>Contexto:</strong> Los representantes nacen sin clave para no enviar contraseñas en claro.
              </p>
              <p className="text-ink-soft">
                <strong>Decisión:</strong> Generar token URL-safe de 32 bytes devuelto una sola vez; en base solo vive <code>SHA-256(token)</code> con TTL de 72h.
              </p>
              <p className="text-ink-faint">
                <strong>Alternativa descartada:</strong> Guardar token en texto plano o contraseñas generadas al azar.
              </p>
            </div>

            {/* ADR 0004 */}
            <div className="surface p-4 space-y-2">
              <div className="flex justify-between items-center border-b border-line pb-2">
                <span className="font-mono font-bold text-brand">ADR-0004</span>
                <span className="rounded bg-ok-soft px-2 py-0.5 text-[10px] font-semibold text-ok">Aceptada</span>
              </div>
              <h4 className="text-[13px] font-bold text-ink">Criterio de redondeo floor por defecto</h4>
              <p className="text-ink-soft">
                <strong>Contexto:</strong> Lectura literal de "N credenciales por cada M m²".
              </p>
              <p className="text-ink-soft">
                <strong>Decisión:</strong> <code>floor</code> como valor predeterminado (un stand de 5-9 m² recibe 0 credenciales Guest/Service de 10 m²), configurable por fila a <code>ceil</code> o <code>round</code>.
              </p>
              <p className="text-ink-faint">
                <strong>Alternativa descartada:</strong> Redondeo aritmético implícito en código.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 8. Topología de Errores (RFC 7807) ────────────────────────────── */}
      {activeTab === 'errors' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">8. Topología de Errores & Respuestas Uniformes (RFC 7807)</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Todas las respuestas de error en la API siguen una estructura JSON canónica con códigos de error estables
              para que el frontend presente alertas amigables y precisas.
            </p>
          </div>

          <div className="surface overflow-hidden">
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint">
                    <th className="pb-2 font-medium">Código HTTP</th>
                    <th className="pb-2 font-medium font-mono">Error Code</th>
                    <th className="pb-2 font-medium">Mensaje al Usuario</th>
                    <th className="pb-2 font-medium">Estructura del Payload (JSON)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  <tr>
                    <td className="py-2.5 font-bold text-alert">409 Conflict</td>
                    <td className="py-2.5 font-mono text-brand font-semibold">PARTICIPANT_ALREADY_REGISTERED</td>
                    <td className="py-2.5">Esa identificación ya está registrada en esta feria por otra empresa.</td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      <code>&#123; "identification": "...", "registered_in": "Florícola X" &#125;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-alert">409 Conflict</td>
                    <td className="py-2.5 font-mono text-brand font-semibold">QUOTA_EXCEEDED</td>
                    <td className="py-2.5">No quedan credenciales disponibles en la categoría solicitada.</td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      <code>&#123; "category": "Exhibitor", "quota": 4, "used": 4, "requested": 1 &#125;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-alert">422 Unprocessable</td>
                    <td className="py-2.5 font-mono text-brand font-semibold">BULK_UPLOAD_INVALID_ROWS</td>
                    <td className="py-2.5">El archivo tiene filas inválidas. No se importó ninguna credencial.</td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      <code>&#123; "errors": [&#123; "row": 3, "field": "identificacion", "message": "..." &#125;] &#125;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-alert">400 Bad Request</td>
                    <td className="py-2.5 font-mono text-brand font-semibold">TOKEN_INVALID_OR_EXPIRED</td>
                    <td className="py-2.5">El enlace no es válido o ya expiró. Solicite uno nuevo.</td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      <code>&#123; "code": "TOKEN_INVALID_OR_EXPIRED" &#125;</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-bold text-alert">401 Unauthorized</td>
                    <td className="py-2.5 font-mono text-brand font-semibold">INVALID_CREDENTIALS</td>
                    <td className="py-2.5">Credenciales inválidas. (Tiempo constante anti-timing).</td>
                    <td className="py-2.5 font-mono text-[11px] text-ink-faint">
                      <code>&#123; "code": "INVALID_CREDENTIALS" &#125;</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── 9. Motor de Reglas & Simulador ───────────────────────────────── */}
      {activeTab === 'rules' && (
        <section className="space-y-6">
          {/* Simulador Interactivo */}
          <div className="surface border border-line bg-fill/30 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2.5">
              <div>
                <span className="label-caps text-brand">Simulador Interactivo</span>
                <h3 className="text-[15px] font-semibold text-ink">Cálculo Dinámico de Cuotas</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-faint">Redondeo:</span>
                <select
                  value={simRounding}
                  onChange={(e) => setSimRounding(e.target.value as 'floor' | 'ceil' | 'round')}
                  className="rounded border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink"
                >
                  <option value="floor">floor (hacia abajo)</option>
                  <option value="ceil">ceil (hacia arriba)</option>
                  <option value="round">round (medio arriba)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span>Metraje del Stand:</span>
                  <strong className="text-brand font-mono">{simM2} m²</strong>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={simM2}
                  onChange={(e) => setSimM2(Number(e.target.value))}
                  className="w-full accent-brand cursor-pointer h-1.5 bg-line rounded-lg"
                />
                <p className="text-[11px] text-ink-faint">
                  Categoría:{' '}
                  <strong className="text-ink">
                    {matchedRange ? `${matchedRange.label} (${matchedRange.min}-${matchedRange.max} m²)` : 'Fuera de rango'}
                  </strong>
                </p>
              </div>

              <div className="surface bg-sage p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="block text-[10px] uppercase font-semibold text-ink-soft">Total Asignado</span>
                  <span className="text-[18px] font-bold text-ink font-mono">{totalQuota} credenciales</span>
                </div>
                <div className="flex gap-2 text-center text-[10px]">
                  <div className="bg-surface rounded p-1.5 border border-line">
                    <span className="text-cat-exhibitor font-bold block">Exp</span>
                    <span className="font-mono font-bold text-[13px]">{exhibitorQuota}</span>
                  </div>
                  <div className="bg-surface rounded p-1.5 border border-line">
                    <span className="text-cat-guest font-bold block">Inv</span>
                    <span className="font-mono font-bold text-[13px]">{guestQuota}</span>
                  </div>
                  <div className="bg-surface rounded p-1.5 border border-line">
                    <span className="text-cat-service font-bold block">Ser</span>
                    <span className="font-mono font-bold text-[13px]">{serviceQuota}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MermaidDiagram
            title="Flujo de Clasificación y Derivación de Cuotas"
            subtitle="Módulo funcional puro app/domain/rules.py sin consultas hardcodeadas."
            chart={RULES_FLOW_CHART}
          />
        </section>
      )}

      {/* ── 10. DevOps & Trazabilidad ────────────────────────────────────── */}
      {activeTab === 'devops' && (
        <section className="space-y-6">
          <div className="surface p-5 space-y-3">
            <h3 className="text-[15px] font-semibold text-ink">10. Infraestructura, CI/CD y Matriz de Trazabilidad</h3>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              Despliegue contenerizado en Docker Compose, integración continua con GitHub Actions y verificación
              estricta de requisitos contra la suite de 205 tests automatizados.
            </p>
          </div>

          <MermaidDiagram
            title="Topología de Contenedores (Docker Compose)"
            subtitle="PostgreSQL 16 en red interna aislada, FastAPI y Nginx frontend."
            chart={DEVOPS_DOCKER_CHART}
          />

          <MermaidDiagram
            title="Pipeline de CI/CD (GitHub Actions)"
            subtitle="Validación completa en cada push: Ruff, Mypy estricto, Pytest (205 tests), Oxlint y Vitest."
            chart={CICD_PIPELINE_CHART}
          />

          {/* Matriz de Trazabilidad */}
          <div className="surface overflow-hidden">
            <div className="border-b border-line bg-fill px-4 py-3">
              <h4 className="text-[13px] font-semibold text-ink">Matriz de Trazabilidad (Requisito ➔ Endpoint ➔ Suite de Test)</h4>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="border-b border-line text-ink-faint font-mono">
                    <th className="pb-2">Requisito de Negocio</th>
                    <th className="pb-2">Endpoint REST</th>
                    <th className="pb-2">Archivo de Test Automatizado</th>
                    <th className="pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-ink">
                  <tr>
                    <td className="py-2.5">Aislamiento multi-feria sin mezclar datos</td>
                    <td className="py-2.5 font-mono">Todos (/api/v1/*)</td>
                    <td className="py-2.5 font-mono">tests/integration/test_constraints.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Parametrización de reglas sin redeploy (Punto Extra E3)</td>
                    <td className="py-2.5 font-mono">/rules/stand-sizes</td>
                    <td className="py-2.5 font-mono">tests/integration/test_rules_parametrization.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Concurrencia atómica en cupos (SELECT FOR UPDATE)</td>
                    <td className="py-2.5 font-mono">POST /me/participants</td>
                    <td className="py-2.5 font-mono">tests/integration/test_quota_concurrency.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Carga masiva Excel en frontend (Punto Extra E2)</td>
                    <td className="py-2.5 font-mono">POST /me/participants/bulk</td>
                    <td className="py-2.5 font-mono">tests/integration/test_bulk_upload.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Notificación de credenciales por email (Punto Extra E1)</td>
                    <td className="py-2.5 font-mono">/me/participants</td>
                    <td className="py-2.5 font-mono">tests/integration/test_emails.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Prevención de IDOR y verificación de claims</td>
                    <td className="py-2.5 font-mono">/auth/login · /me/*</td>
                    <td className="py-2.5 font-mono">tests/integration/test_authz.py</td>
                    <td className="py-2.5"><span className="text-ok font-semibold">✓ 100% Pasando</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
