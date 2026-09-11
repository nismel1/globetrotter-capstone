#!/usr/bin/env bash

# ============================================================
# osrm-prepare.sh
# Préparation OSRM pour Globetrotter-LBV
#
# Compatible :
#   - Windows
#   - Git Bash
#   - Docker Desktop
#
# Architecture :
#   Windows
#      │
#      ├── osrm-data-tmp/       ← téléchargement PBF
#      │
#      └── Docker volume
#             └── OSRM processing
#
# ============================================================

set -e

# ============================================================
# CONFIGURATION
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

TMP_DIR="$PROJECT_DIR/osrm-data-tmp"

OSM_FILE="gabon-latest.osm.pbf"
OSM_URL="https://download.geofabrik.de/africa/gabon-latest.osm.pbf"

DOCKER_IMAGE="ghcr.io/project-osrm/osrm-backend:latest"
# Doit correspondre au volume déclaré dans docker-compose.yml (osrm_data).
OSRM_VOLUME="globetrotter-osrm-data"

# ============================================================
# COULEURS
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================
# FONCTIONS
# ============================================================

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# ============================================================
# VERIFICATIONS
# ============================================================

echo ""
echo "============================================================"
echo "       GLOBETROTTER - PREPARATION OSRM GABON"
echo "============================================================"
echo ""

command -v docker >/dev/null 2>&1 || error "Docker n'est pas installé ou inaccessible."

docker info >/dev/null 2>&1 || error "Docker Desktop n'est pas démarré."

success "Docker disponible"

mkdir -p "$TMP_DIR"

success "Répertoire temporaire : $TMP_DIR"

# ============================================================
# TELECHARGEMENT OSM
# ============================================================

OSM_PATH="$TMP_DIR/$OSM_FILE"

echo ""
echo "[1/5] Téléchargement des données OpenStreetMap..."
echo ""

if [ -f "$OSM_PATH" ]; then

    FILE_SIZE=$(stat -c%s "$OSM_PATH" 2>/dev/null || echo 0)

    if [ "$FILE_SIZE" -gt 1000000 ]; then
        info "Fichier déjà présent : $OSM_FILE"
        info "Taille : $(du -h "$OSM_PATH" | cut -f1)"
    else
        warning "Fichier existant trop petit, téléchargement à nouveau..."
        rm -f "$OSM_PATH"
    fi
fi

if [ ! -f "$OSM_PATH" ]; then

    info "Téléchargement depuis :"
    echo "$OSM_URL"
    echo ""

    curl -L --fail --progress-bar \
        "$OSM_URL" \
        -o "$OSM_PATH"

    success "Téléchargement terminé"
fi

# Vérification

if [ ! -f "$OSM_PATH" ]; then
    error "Impossible de trouver $OSM_PATH"
fi

FILE_SIZE=$(stat -c%s "$OSM_PATH" 2>/dev/null || echo 0)

if [ "$FILE_SIZE" -lt 1000000 ]; then
    error "Le fichier PBF semble invalide ou incomplet."
fi

success "Fichier PBF valide : $(du -h "$OSM_PATH" | cut -f1)"

# ============================================================
# CREATION DU VOLUME DOCKER
# ============================================================

echo ""
echo "[2/5] Préparation du volume Docker..."
echo ""

if docker volume inspect "$OSRM_VOLUME" >/dev/null 2>&1; then
    info "Volume existant : $OSRM_VOLUME"
else
    docker volume create "$OSRM_VOLUME" >/dev/null
    success "Volume créé : $OSRM_VOLUME"
fi

# ============================================================
# COPIE DU PBF DANS LE VOLUME
# ============================================================

echo ""
echo "[3/5] Copie des données dans le volume OSRM..."
echo ""

DATA_DIR_WINDOWS="$(cygpath -w "$TMP_DIR")"

MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=bind,source=$DATA_DIR_WINDOWS,target=/source" \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    alpine:3.20 \
    sh -c "cp /source/$OSM_FILE /data/$OSM_FILE"

success "PBF copié dans le volume Docker"

# ============================================================
# EXTRACTION
# ============================================================

echo ""
echo "[4/5] Extraction OSRM..."
echo ""

MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    "$DOCKER_IMAGE" \
    osrm-extract \
    -p /opt/car.lua \
    "/data/$OSM_FILE"

success "Extraction OSRM terminée"

# ============================================================
# PARTITION
# ============================================================

echo ""
echo "[5/5] Partitionnement et optimisation..."
echo ""

MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    "$DOCKER_IMAGE" \
    osrm-partition \
    "/data/$OSM_FILE"

success "Partitionnement terminé"

MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    "$DOCKER_IMAGE" \
    osrm-customize \
    "/data/$OSM_FILE"

success "Optimisation terminée"

# ============================================================
# VERIFICATION DANS LE VOLUME
# ============================================================

echo ""
echo "============================================================"
echo "              VERIFICATION DES FICHIERS"
echo "============================================================"
echo ""

MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    alpine:3.20 \
    sh -c "ls -lh /data"

echo ""

# Vérification du fichier principal

if MSYS_NO_PATHCONV=1 docker run --rm \
    --mount "type=volume,source=$OSRM_VOLUME,target=/data" \
    alpine:3.20 \
    sh -c "test -f /data/$OSM_FILE"; then

    success "Données OSRM présentes dans le volume."
else
    error "Le fichier OSRM principal est absent du volume."
fi

# ============================================================
# NETTOYAGE
# ============================================================

echo ""
info "Le fichier PBF reste dans :"
echo "$OSM_PATH"

echo ""
info "Les données OSRM sont stockées dans le volume Docker :"
echo "$OSRM_VOLUME"

# ============================================================
# RESUME
# ============================================================

echo ""
echo "============================================================"
echo "                 PREPARATION TERMINEE"
echo "============================================================"
echo ""

success "OSRM Gabon est prêt."

echo ""
echo "Volume Docker :"
echo "  $OSRM_VOLUME"

echo ""
echo "Pour démarrer OSRM :"
echo "  docker compose up -d osrm"

echo ""
echo "Pour vérifier les logs :"
echo "  docker compose logs -f osrm"

echo ""
echo "Pour vérifier le volume :"
echo "  docker volume inspect $OSRM_VOLUME"

echo ""
echo "============================================================"