#!/usr/bin/env bash
# Arma el ZIP de entrega con la estructura exacta que pide el enunciado.
#
#   1_Diseno_y_BD/   DER, casos de uso, script SQL y datos iniciales
#   2_Aplicacion/    README.md, Back/, Front/, docker-compose.yml, .env.example
#   3_Presentacion/  PDF de 5 paginas
#
# No incluye node_modules, venv, caches, .git ni .env: "sin dependencias pesadas" significa
# que el evaluador las instala con `docker compose up`, no que evitemos librerias.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
salida="$raiz/entrega.zip"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/1_Diseno_y_BD" "$tmp/2_Aplicacion/Back" "$tmp/2_Aplicacion/Front" "$tmp/3_Presentacion"

# --- 1. Diseño y base de datos ---
cp "$raiz/docs/der.png" "$raiz/docs/der.dot" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/casos-de-uso.png" "$raiz/docs/casos-de-uso.dot" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/esquema.sql" "$tmp/1_Diseno_y_BD/"
cp "$raiz/docs/datos-iniciales.md" "$tmp/1_Diseno_y_BD/"

# --- 2. Aplicación ---
excluidos=(
  --exclude=node_modules --exclude=dist --exclude=.venv --exclude=venv
  --exclude=__pycache__ --exclude=.mypy_cache --exclude=.pytest_cache --exclude=.ruff_cache
  --exclude=*.egg-info --exclude=.env --exclude=.git
  # Salida de `generate_mocks.py` dentro del contenedor: duplica datos_de_mocks/.
  --exclude=datos_de_mocks_temp
)
tar -C "$raiz/backend"  "${excluidos[@]}" -cf - . | tar -C "$tmp/2_Aplicacion/Back"  -xf -
tar -C "$raiz/frontend" "${excluidos[@]}" -cf - . | tar -C "$tmp/2_Aplicacion/Front" -xf -
cp "$raiz/README.md" "$raiz/.env.example" "$tmp/2_Aplicacion/"
tar -C "$raiz/docs" "${excluidos[@]}" --exclude=PLAN.md -cf - . | tar -C "$tmp/2_Aplicacion" -xf - --one-top-level=docs

# El README enlaza el pipeline y los Excel de prueba: si no viajan, esos enlaces se rompen
# dentro del ZIP y el evaluador no puede ver como se despliega ni probar la carga masiva.
mkdir -p "$tmp/2_Aplicacion/.github"
cp -r "$raiz/.github/workflows" "$tmp/2_Aplicacion/.github/"
cp -r "$raiz/datos_de_mocks" "$tmp/2_Aplicacion/"

# El compose de la entrega apunta a Back/ y Front/, que es como se llaman las carpetas en el
# ZIP. Es la unica diferencia con el del repositorio, y por eso el ZIP se verifica levantado
# desde una carpeta limpia.
sed -e 's#build: ./backend#build: ./Back#' \
    -e 's#- ./backend:/app#- ./Back:/app#' \
    -e 's#build: ./frontend#build: ./Front#' \
    "$raiz/docker-compose.yml" > "$tmp/2_Aplicacion/docker-compose.yml"

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
echo "ZIP: $salida"
unzip -l "$salida" | tail -1
