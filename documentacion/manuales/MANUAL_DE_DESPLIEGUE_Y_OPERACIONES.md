# 🛠️ Manual de Despliegue, Operaciones y Runbook SysAdmin
## Plataforma de Gestión de Acreditaciones Multi-Tenant — *Expo Flor Ecuador*

---

### Control del Documento
- **Documento ID:** MAN-OPS-03
- **Estándar:** ISO/IEC 20000-1 (Gestión de Servicios de TI) / ITIL v4 Operations
- **Audiencia:** Ingenieros DevOps, Administradores de Sistemas y Personal de Operaciones de Infraestructura
- **Versión:** 1.0.0
- **Fecha:** 2026-09-04

---

## 1. Requisitos del Sistema

### 1.1. Especificaciones de Hardware Mínimas y Recomendadas

| Recurso | Entorno de Desarrollo / Pruebas | Entorno de Producción (Feria) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPUs | 4 vCPUs (Intel Xeon / AMD EPYC) |
| **Memoria RAM** | 4 GB RAM | 8 GB a 16 GB RAM ECC |
| **Almacenamiento** | 20 GB SSD | 50 GB NVMe SSD (RAID 1 recomendado) |
| **Red** | Conexión estándar | 1 Gbps con IP pública estática y TLS 1.3 |

### 1.2. Requisitos de Software
- **Sistema Operativo:** Ubuntu Server 22.04 LTS o 24.04 LTS / Debian 12 / AlmaLinux 9.
- **Motor de Contenedores:** Docker Engine v24.0 o superior.
- **Orquestador:** Docker Compose v2.20 o superior.
- **Herramientas de Soporte:** OpenSSL, Git, `curl`, `jq`, `postgresql-client-16`.

---

## 2. Variables de Entorno de Producción (`.env.production`)

> [!IMPORTANT]
> **Aviso de Seguridad — Ejemplo Sintáctico Ilustrativo:**  
> Los valores listados a continuación son **únicamente ejemplos sintácticos de referencia** para ilustrar la estructura y formato de las variables. En un despliegue real de producción, el administrador de infraestructura **DEBE reemplazar todos los valores por credenciales reales y seguras**, generando la clave `JWT_SECRET_KEY` en la terminal mediante el comando `openssl rand -hex 32`. Nunca reutilice ejemplos en entornos productivos.

Cree el archivo `.env` en la raíz del servidor basándose en la siguiente plantilla:

```ini
# ── CONFIGURACIÓN GENERAL ──────────────────────────────────────────────────
ENVIRONMENT=production
PROJECT_NAME="Expo Flor Ecuador"
LOG_LEVEL=INFO

# ── BASE DE DATOS POSTGRESQL ───────────────────────────────────────────────
POSTGRES_USER=expoflores_app
POSTGRES_PASSWORD=CAMBIAR_POR_PASSWORD_CRIPTOGRAFICO_MUY_LARGO_Y_SEGURO
POSTGRES_DB=expoflores_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

# ── SEGURIDAD Y TOKENS JWT (EJEMPLO SINTÁCTICO) ─────────────────────────────
# Generar clave criptográfica única de 256 bits en la terminal con: openssl rand -hex 32
JWT_SECRET_KEY=CAMBIAR_GENERAR_CON_OPENSSL_RAND_HEX_32
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=480
MAGIC_LINK_TTL_HOURS=72

# ── SERVICIO DE CORREO SMTP ────────────────────────────────────────────────
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.CAMBIAR_POR_API_KEY_SMTP_REAL
MAIL_FROM=acreditaciones@expoflor.com
MAIL_FROM_NAME="Acreditaciones Expo Flor"
MAIL_STARTTLS=true
MAIL_SSL_TLS=false

# ── FRONTEND & CORS ────────────────────────────────────────────────────────
FRONTEND_URL=https://acreditaciones.expoflor.com
BACKEND_CORS_ORIGINS=["https://acreditaciones.expoflor.com"]
```

---

## 3. Procedimiento de Despliegue en Frío (*Cold Start*)

### Paso 1: Clonar el Repositorio y Configurar Variables
```bash
cd /opt
git clone https://github.com/expoflores/acreditaciones-platform.git expoflor
cd expoflor
cp .env.production.example .env
# Editar y asegurar credenciales
chmod 600 .env
```

### Paso 2: Construir y Levantar los Contenedores
```bash
docker compose up -d --build
```

### Paso 3: Verificar Estado de Salud de los Servicios
```bash
docker compose ps
```
Debe observar los tres contenedores con estado `Up` y la base de datos `(healthy)`.

---

## 4. Política de Copias de Seguridad (*Backups*) y Restauración

### 4.1. Backup Diario Automatizado de PostgreSQL (Script Cron)
Guarde el siguiente script en `/opt/scripts/backup_db.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/expoflores"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="expoflores_db_${DATE}.sql.gz"

mkdir -p "${BACKUP_DIR}"

# Volcado atómico en caliente sin bloqueo de lecturas
docker compose -f /opt/expoflor/docker-compose.yml exec -T db \
  pg_dump -U expoflores_app -d expoflores_db --clean --if-exists --no-owner | gzip > "${BACKUP_DIR}/${FILENAME}"

# Purgar copias con más de 30 días de antigüedad
find "${BACKUP_DIR}" -type f -name "expoflores_db_*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup exitoso: ${FILENAME}"
```

Asigne permisos de ejecución y configure la tarea programada:
```bash
chmod +x /opt/scripts/backup_db.sh
# Añadir al crontab diario (2:00 AM)
echo "0 2 * * * root /opt/scripts/backup_db.sh >> /var/log/expoflor_backup.log 2>&1" > /etc/cron.d/expoflor_backup
```

### 4.2. Procedimiento de Restauración de Base de Datos
```bash
# 1. Descomprimir el archivo de respaldo
gunzip -c /var/backups/expoflores/expoflores_db_20260904_020000.sql.gz > /tmp/restore.sql

# 2. Restaurar la base de datos mediante el cliente PostgreSQL
cat /tmp/restore.sql | docker compose exec -T db psql -U expoflores_app -d expoflores_db

# 3. Limpiar archivo temporal
rm /tmp/restore.sql
```

---

## 5. Actualización de Versión en Producción (*Zero-Downtime Deployment*)

```bash
cd /opt/expoflor

# 1. Obtener los últimos cambios de la rama main
git pull origin main

# 2. Reconstruir imágenes de backend y frontend
docker compose build backend frontend

# 3. Ejecutar migraciones de base de datos
docker compose run --rm backend alembic upgrade head

# 4. Reiniciar contenedores de aplicación con reemplazo suave
docker compose up -d --no-deps backend frontend

# 5. Comprobar que la API responda 200 OK
curl -f http://localhost:8000/health || echo "ERROR EN HEALTHCHECK"
```

---

## 6. Runbook de Resolución de Incidentes (*Troubleshooting*)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MATRIZ DE TROUBLESHOOTING                              │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Síntoma / Incidencia     │ Causa Probable              │ Acción Correctiva Inmediata   │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Backend no inicia        │ PostgreSQL no listo         │ Revisar `docker compose logs  │
│ (CrashLoopBackOff)       │ o credenciales incorrectas  │ db` y validar `DATABASE_URL`. │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Errores 500 en Login     │ JWT_SECRET_KEY no definida  │ Verificar que `.env` contenga │
│                          │ o longitud insuficiente     │ una clave de 256 bits.        │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Correos no se envían     │ Servidor SMTP bloqueado o   │ Probar conectividad con:      │
│                          │ credenciales inválidas      │ `telnet $MAIL_SERVER $PORT`.  │
├──────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Bloqueos en cupos        │ Transacción congelada       │ Consultar `pg_stat_activity`  │
│ (Deadlock / Lock Timeout)│ por conexión interrumpida   │ y matar PID bloqueador.       │
└──────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```
