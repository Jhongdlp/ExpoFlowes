#!/usr/bin/env bash
# Arma el ZIP de entrega con la estructura exacta que pide el enunciado.
#
#   1_Diseno_y_BD/   DER, casos de uso, script SQL y datos iniciales
#   2_Aplicacion/    README.md, backend/, frontend/, docker-compose.yml, .env.example
#   3_Presentacion/  PDF de 5 paginas
#
# Las carpetas de codigo conservan su nombre del repositorio (backend/ y frontend/): asi el
# docker-compose.yml, el README y los enlaces de la documentacion viajan sin reescribir nada,
# y lo que el evaluador levanta es exactamente lo que esta en GitHub.
#
# No incluye node_modules, venv, caches, .git ni .env: "sin dependencias pesadas" significa
# que el evaluador las instala con `docker compose up`, no que evitemos librerias.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
salida="$raiz/entrega.zip"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/1_Diseno_y_BD" "$tmp/2_Aplicacion/backend" "$tmp/2_Aplicacion/frontend" "$tmp/3_Presentacion"

# Índice en la raíz del ZIP: al descomprimir se ven tres carpetas numeradas y nada más.
cat > "$tmp/LEEME.txt" <<'TXT'
Entrega — Plataforma de expositores y credenciales (Expo Flor Ecuador)

  1_Diseno_y_BD/   DER, casos de uso, esquema SQL, datos iniciales y migraciones
  2_Aplicacion/    README.md (empezar aquí), backend/, frontend/, docker-compose.yml,
                   .env.example, documentacion/ y datos_de_mocks/
  3_Presentacion/  Presentación en PDF (5 páginas)

Puesta en marcha:  2_Aplicacion/README.md  ->  docker compose up -d --build
Repositorio:       https://github.com/Jhongdlp/ExpoFlowes
TXT

# --- 1. Diseño y base de datos ---
cp "$raiz/docs/der.png" "$raiz/docs/der.dot" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/casos-de-uso.png" "$raiz/docs/casos-de-uso.dot" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/esquema.sql" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/datos-iniciales.md" "$tmp/1_Diseno_y_BD/"
# El enunciado admite "script SQL o indicación de migraciones": van las dos. La fuente de
# verdad es la migración; el .sql es el volcado legible.
mkdir -p "$tmp/1_Diseno_y_BD/migraciones"
cp "$raiz"/backend/alembic/versions/*.py "$tmp/1_Diseno_y_BD/migraciones/"

# --- 2. Aplicación ---
excluidos=(
  --exclude=node_modules --exclude=dist --exclude=.venv --exclude=venv
  --exclude=__pycache__ --exclude=.mypy_cache --exclude=.pytest_cache --exclude=.ruff_cache
  --exclude=*.egg-info --exclude=.env --exclude=.git
  # Salida de `generate_mocks.py` dentro del contenedor: duplica datos_de_mocks/.
  --exclude=datos_de_mocks_temp
)
tar -C "$raiz/backend"  "${excluidos[@]}" -cf - . | tar -C "$tmp/2_Aplicacion/backend"  -xf -
tar -C "$raiz/frontend" "${excluidos[@]}" -cf - . | tar -C "$tmp/2_Aplicacion/frontend" -xf -
cp "$raiz/README.md" "$raiz/.env.example" "$tmp/2_Aplicacion/"
tar -C "$raiz/docs" "${excluidos[@]}" --exclude=PLAN.md -cf - . | tar -C "$tmp/2_Aplicacion" -xf - --one-top-level=docs

# El README enlaza el pipeline y los Excel de prueba: si no viajan, esos enlaces se rompen
# dentro del ZIP y el evaluador no puede ver como se despliega ni probar la carga masiva.
mkdir -p "$tmp/2_Aplicacion/.github"
cp -r "$raiz/.github/workflows" "$tmp/2_Aplicacion/.github/"
cp -r "$raiz/datos_de_mocks" "$tmp/2_Aplicacion/"

# Documentación extendida (arquitectura C4, STRIDE, manuales de usuario y operación). No es
# obligatoria por el enunciado; se incluye porque sostiene y amplía las decisiones de diseño.
cp -r "$raiz/documentacion" "$tmp/2_Aplicacion/"

# El compose viaja tal cual: sus rutas (./backend, ./frontend) ya coinciden con las carpetas
# del ZIP. Aun asi la entrega se verifica levantada desde una carpeta limpia.
cp "$raiz/docker-compose.yml" "$tmp/2_Aplicacion/docker-compose.yml"

# --- 3. Presentación ---
cp "$raiz/docs/presentacion.pdf" "$tmp/3_Presentacion/Expoflores-presentacion.pdf"

rm -f "$salida"
# Con python3 en vez de `zip`: no todas las maquinas traen el binario, y python3 si.
python3 - "$tmp" "$salida" <<'PY'
import sys, zipfile
from pathlib import Path

origen, destino = Path(sys.argv[1]), Path(sys.argv[2])
with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
    for path in sorted(origen.rglob("*")):
        z.write(path, path.relative_to(origen))
PY
echo
echo "ZIP: $salida  ($(du -h "$salida" | cut -f1))"
echo "Contenido (primer nivel de cada carpeta):"
python3 - "$salida" <<'PY'
import sys, zipfile
names = zipfile.ZipFile(sys.argv[1]).namelist()
top = sorted({n.split("/")[0] for n in names if n})
for t in top:
    print(f"  {t}")
    subs = sorted({n.split("/")[1] for n in names if n.startswith(t + "/") and n.count("/") >= 1 and n.split("/")[1]})
    for s in subs:
        print(f"    {s}")
PY
echo
echo "Verificación de que no viajó basura:"
if unzip -l "$salida" | grep -qE 'node_modules|/\.env$|__pycache__|\.mypy_cache|\.pytest_cache|\.ruff_cache|\.git/|egg-info|/dist/'; then
  echo "  ¡ATENCIÓN! el ZIP contiene artefactos que no deberían estar (ver arriba)."
  exit 1
fi
echo "  OK: sin node_modules, .env, caches ni .git."
