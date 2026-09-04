-- =====================================================================================
-- Esquema de la base de datos — Plataforma de expositores y credenciales
--
-- Generado con:  alembic upgrade head --sql
--
-- La fuente de verdad del esquema es la migracion de Alembic
-- (2_Aplicacion/Back/alembic/versions/), no este archivo: al levantar el proyecto con
-- `docker compose up`, el backend aplica `alembic upgrade head` y siembra los datos solo.
-- Este volcado se incluye para poder leer el esquema sin ejecutar nada.
--
-- Puntos a mirar:
--   * event_id en toda tabla operativa: el aislamiento entre ferias es del modelo.
--   * uq_participants_event_id_ident: la validacion critica, a nivel de base.
--   * uq_exhibitors_event_tax_id: indice parcial WHERE deleted_at IS NULL (borrado logico).
--   * ck_participants_provider_company: empresa proveedora si y solo si categoria Service.
--   * stand_size_rules y credential_rules: las reglas de negocio son datos, no codigo.
-- =====================================================================================

BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 0001

CREATE TABLE events (
    id SERIAL NOT NULL, 
    name VARCHAR(160) NOT NULL, 
    slug VARCHAR(80) NOT NULL, 
    year INTEGER NOT NULL, 
    starts_on DATE NOT NULL, 
    ends_on DATE NOT NULL, 
    is_active BOOLEAN DEFAULT true NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (slug)
);

CREATE TABLE stand_size_rules (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    label VARCHAR(40) NOT NULL, 
    min_m2 INTEGER NOT NULL, 
    max_m2 INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT uq_stand_size_rules_event_label UNIQUE (event_id, label), 
    CONSTRAINT ck_stand_size_rules_range CHECK (min_m2 >= 0 AND max_m2 >= min_m2), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX ix_stand_size_rules_event_id ON stand_size_rules (event_id);

CREATE TABLE credential_rules (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    category VARCHAR(20) NOT NULL, 
    credentials_per_block INTEGER NOT NULL, 
    block_m2 INTEGER NOT NULL, 
    rounding_mode VARCHAR(10) DEFAULT 'floor' NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT uq_credential_rules_event_category UNIQUE (event_id, category), 
    CONSTRAINT ck_credential_rules_category CHECK (category IN ('Exhibitor', 'Guest', 'Service')), 
    CONSTRAINT ck_credential_rules_rounding CHECK (rounding_mode IN ('floor', 'ceil', 'round')), 
    CONSTRAINT ck_credential_rules_positive CHECK (block_m2 > 0 AND credentials_per_block >= 0), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX ix_credential_rules_event_id ON credential_rules (event_id);

CREATE TABLE exhibitors (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    tax_id VARCHAR(20) NOT NULL, 
    tax_id_type VARCHAR(20) NOT NULL, 
    legal_name VARCHAR(200) NOT NULL, 
    stand_name VARCHAR(160) NOT NULL, 
    address VARCHAR(255) NOT NULL, 
    requested_m2 INTEGER NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_exhibitors_tax_id_type CHECK (tax_id_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')), 
    CONSTRAINT ck_exhibitors_requested_m2 CHECK (requested_m2 > 0), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE
);

CREATE INDEX ix_exhibitors_event_id ON exhibitors (event_id);

CREATE UNIQUE INDEX uq_exhibitors_event_tax_id ON exhibitors (event_id, tax_id) WHERE deleted_at IS NULL;

CREATE TABLE representatives (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    exhibitor_id INTEGER NOT NULL, 
    full_name VARCHAR(160) NOT NULL, 
    identification VARCHAR(20) NOT NULL, 
    identification_type VARCHAR(20) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    phone VARCHAR(30) NOT NULL, 
    position VARCHAR(80) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_representatives_id_type CHECK (identification_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE, 
    UNIQUE (exhibitor_id), 
    FOREIGN KEY(exhibitor_id) REFERENCES exhibitors (id) ON DELETE CASCADE
);

CREATE INDEX ix_representatives_event_id ON representatives (event_id);

CREATE TABLE exhibitor_contacts (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    exhibitor_id INTEGER NOT NULL, 
    name VARCHAR(160) NOT NULL, 
    phone VARCHAR(30) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE, 
    FOREIGN KEY(exhibitor_id) REFERENCES exhibitors (id) ON DELETE CASCADE
);

CREATE INDEX ix_exhibitor_contacts_exhibitor_id ON exhibitor_contacts (exhibitor_id);

CREATE INDEX ix_exhibitor_contacts_event_id ON exhibitor_contacts (event_id);

CREATE TABLE users (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    exhibitor_id INTEGER, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255), 
    role VARCHAR(20) NOT NULL, 
    is_active BOOLEAN DEFAULT true NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT uq_users_event_email UNIQUE (event_id, email), 
    CONSTRAINT ck_users_role CHECK (role IN ('admin', 'representative')), 
    CONSTRAINT ck_users_role_exhibitor CHECK ((role = 'admin' AND exhibitor_id IS NULL) OR (role = 'representative' AND exhibitor_id IS NOT NULL)), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE, 
    FOREIGN KEY(exhibitor_id) REFERENCES exhibitors (id) ON DELETE CASCADE
);

CREATE INDEX ix_users_event_id ON users (event_id);

CREATE TABLE password_setup_tokens (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    token_hash VARCHAR(64) NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    used_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (token_hash)
);

CREATE INDEX ix_password_setup_tokens_user_id ON password_setup_tokens (user_id);

CREATE TABLE participants (
    id SERIAL NOT NULL, 
    event_id INTEGER NOT NULL, 
    exhibitor_id INTEGER NOT NULL, 
    first_name VARCHAR(80) NOT NULL, 
    last_name VARCHAR(80) NOT NULL, 
    identification VARCHAR(20) NOT NULL, 
    identification_type VARCHAR(20) NOT NULL, 
    phone VARCHAR(30) NOT NULL, 
    position VARCHAR(80) NOT NULL, 
    category VARCHAR(20) NOT NULL, 
    provider_company VARCHAR(200), 
    email VARCHAR(255), 
    credential_notified_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    PRIMARY KEY (id), 
    CONSTRAINT uq_participants_event_id_ident UNIQUE (event_id, identification), 
    CONSTRAINT ck_participants_category CHECK (category IN ('Exhibitor', 'Guest', 'Service')), 
    CONSTRAINT ck_participants_id_type CHECK (identification_type IN ('CEDULA', 'RUC', 'PASSPORT', 'FOREIGN_ID')), 
    CONSTRAINT ck_participants_provider_company CHECK ((category = 'Service') = (provider_company IS NOT NULL)), 
    FOREIGN KEY(event_id) REFERENCES events (id) ON DELETE CASCADE, 
    FOREIGN KEY(exhibitor_id) REFERENCES exhibitors (id) ON DELETE CASCADE
);

CREATE INDEX ix_participants_exhibitor_id ON participants (exhibitor_id);

CREATE INDEX ix_participants_event_id ON participants (event_id);

INSERT INTO alembic_version (version_num) VALUES ('0001') RETURNING alembic_version.version_num;

COMMIT;

