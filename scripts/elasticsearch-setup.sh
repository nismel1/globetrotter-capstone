#!/bin/bash
# ============================================================
# elasticsearch-setup.sh
# Crée l'index Elasticsearch et indexe les 30 destinations.
# À lancer APRÈS docker-compose up (quand ES est healthy).
#
# Usage :
#   chmod +x scripts/elasticsearch-setup.sh
#   ./scripts/elasticsearch-setup.sh
# ============================================================

set -e

ES="http://localhost:9200"
INDEX="globetrotter_places"
API="http://localhost:4000/api"
MAPPING_FILE="$(pwd)/es-mapping-tmp.json"

echo "======================================================"
echo "  Globetrotter — Setup Elasticsearch"
echo "======================================================"

# Attendre qu'Elasticsearch soit prêt
echo "[1/3] Attente d'Elasticsearch..."
until curl -sf "$ES/_cluster/health" > /dev/null 2>&1; do
  echo "  → Elasticsearch démarrage..."
  sleep 3
done
echo "  ✓ Elasticsearch prêt."

# Créer l'index avec le mapping approprié
echo "[2/3] Création de l'index $INDEX..."
curl -sf -X DELETE "$ES/$INDEX" > /dev/null 2>&1 || true

# On écrit le mapping dans un fichier temporaire plutôt que de le
# passer inline avec -d '{...}' : sous Git Bash/Windows, les
# apostrophes et guillemets imbriqués sur plusieurs lignes sont
# souvent mal interprétés et cassent la requête silencieusement.
cat > "$MAPPING_FILE" << 'JSON_EOF'
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "french_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "french_stop", "french_stemmer", "asciifolding"]
        }
      },
      "filter": {
        "french_stop": {
          "type": "stop",
          "stopwords": "_french_"
        },
        "french_stemmer": {
          "type": "stemmer",
          "language": "light_french"
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "id":             { "type": "keyword" },
      "name":           { "type": "text", "analyzer": "french_analyzer" },
      "description":    { "type": "text", "analyzer": "french_analyzer" },
      "long_description": { "type": "text", "analyzer": "french_analyzer" },
      "address":        { "type": "text",    "analyzer": "french_analyzer" },
      "category_name":  { "type": "keyword", "copy_to": "search_all" },
      "cover_image":    { "type": "keyword", "index": false },
      "rating":         { "type": "float" },
      "price_level":    { "type": "keyword" },
      "latitude":       { "type": "float",   "index": false },
      "longitude":      { "type": "float",   "index": false },
      "status":         { "type": "keyword" },
      "indexed_at":     { "type": "date" },
      "location": {
        "type": "geo_point"
      }
    }
  }
}
JSON_EOF

HTTP_CODE=$(curl -s -o /tmp/es_create_response.json -w "%{http_code}" \
  -X PUT "$ES/$INDEX" \
  -H 'Content-Type: application/json' \
  --data-binary "@$MAPPING_FILE")

rm -f "$MAPPING_FILE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "  ❌ Échec de la création de l'index (HTTP $HTTP_CODE) :"
  cat /tmp/es_create_response.json 2>/dev/null
  echo ""
  read -p "Appuie sur Entrée pour fermer..."
  exit 1
fi
echo "  ✓ Index créé."

# Récupérer un token admin et indexer les lieux
echo "[3/3] Indexation des destinations..."

TOKEN=$(curl -sf -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@admin.com","password":"admin123"}' | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null) || true

if [ -z "$TOKEN" ]; then
  echo "  ⚠ Impossible d'obtenir un token admin. Vérifiez que le backend tourne."
  echo "  Vous pouvez réindexer manuellement via : POST /api/search/index/:place_id"
  echo ""
  echo "======================================================"
  echo "  ✅ Index Elasticsearch créé (indexation à refaire plus tard)."
  echo "======================================================"
  read -p "Appuie sur Entrée pour fermer..."
  exit 0
fi

# Récupérer tous les lieux et les indexer
PLACES=$(curl -sf "$API/places?limit=100" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$PLACES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('places',[])))" 2>/dev/null || echo "0")

echo "  → $COUNT lieux trouvés à indexer..."

echo "$PLACES" | python3 - << 'PYEOF'
import sys, json, urllib.request

data = json.load(sys.stdin)
places = data.get('places', [])
es = 'http://localhost:9200/globetrotter_places/_doc'

indexed = 0
for p in places:
    doc = {
        'id': p.get('id'),
        'name': p.get('name', ''),
        'description': p.get('description', ''),
        'long_description': p.get('long_description', ''),
        'address': p.get('address', ''),
        'category_name': p.get('category_name', ''),
        'cover_image': p.get('cover_image', ''),
        'rating': p.get('rating'),
        'price_level': p.get('price_level', ''),
        'latitude': p.get('latitude'),
        'longitude': p.get('longitude'),
        'status': p.get('status', 'published'),
        'indexed_at': __import__('datetime').datetime.utcnow().isoformat() + 'Z',
    }
    if doc['latitude'] and doc['longitude']:
        doc['location'] = {'lat': doc['latitude'], 'lon': doc['longitude']}

    req = urllib.request.Request(
        f"{es}/{doc['id']}",
        data=json.dumps(doc).encode(),
        headers={'Content-Type': 'application/json'},
        method='PUT'
    )
    try:
        urllib.request.urlopen(req)
        indexed += 1
    except Exception as e:
        print(f"  ✗ Erreur indexation {doc['id']}: {e}")

print(f"  ✓ {indexed}/{len(places)} lieux indexés.")
PYEOF

echo ""
echo "======================================================"
echo "  ✅ Elasticsearch configuré."
echo "  Index : $INDEX"
echo "  Recherche : GET /api/search?q=<terme>"
echo "======================================================"
read -p "Appuie sur Entrée pour fermer..."