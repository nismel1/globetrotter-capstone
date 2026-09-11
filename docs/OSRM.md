# OSRM — Calcul d'itinéraires Globetrotter

## Architecture

```
React (RouteMap.jsx)
  └── POST /api/routing/route  (JWT requis)
  └── POST /api/routing/trip   (JWT requis)
           │
           ▼
     API Gateway (verifyJWT)
           │
           ▼
     OSRM Container (réseau interne Docker — non exposé)
```

**Le client React ne contacte jamais OSRM directement.**
L'API Gateway vérifie le JWT avant chaque proxy, protégeant le serveur de routage.

---

## Première installation (à faire une seule fois)

OSRM nécessite des données cartographiques pré-traitées (fichiers `.osrm`).
Ce traitement peut prendre 5–15 minutes selon la machine.

```bash
# 1. Rendre le script exécutable
chmod +x scripts/osrm-prepare.sh

# 2. Lancer la préparation (télécharge la carte Gabon + traitement OSRM)
./scripts/osrm-prepare.sh

# 3. Lancer toute la stack
docker-compose up -d
```

---

## Démarrages suivants

```bash
docker-compose up -d
```
Les données OSRM sont persistées dans le volume `osrm_data`.

---

## API Endpoints

### POST `/api/routing/route`
Calcule l'itinéraire dans **l'ordre exact** des waypoints (A→B→C).

```json
{
  "waypoints": [
    { "lat": 0.3924, "lon": 9.4536, "name": "Port-Môle" },
    { "lat": 0.3920, "lon": 9.4530, "name": "Marché Mont-Bouët" },
    { "lat": 0.5500, "lon": 9.5000, "name": "Akanda" }
  ],
  "profile": "driving"
}
```

Profils disponibles : `driving` | `walking` | `cycling`

### POST `/api/routing/trip`
Calcule l'itinéraire avec **ordre optimisé** (OSRM détermine le meilleur ordre).
Utile quand l'utilisateur veut visiter toutes les étapes sans se soucier de l'ordre.

Même corps que `/route`.

### Réponse

```json
{
  "code": "Ok",
  "routes": [{
    "geometry": { "type": "LineString", "coordinates": [[lon, lat], ...] },
    "legs": [{ "distance": 1234, "duration": 567 }, ...],
    "distance": 5678,
    "duration": 1200
  }],
  "waypoints": [{ "location": [lon, lat], "name": "...", "hint": "..." }, ...]
}
```

---

## Inversion des coordonnées

| Système | Format  |
|---------|---------|
| OSRM URL | `[longitude, latitude]` |
| GeoJSON retourné | `[longitude, latitude]` |
| Leaflet `<MapContainer>` / `<Marker>` | `[latitude, longitude]` |

`RouteMap.jsx` gère cette inversion automatiquement.

---

## Mise à jour des données cartographiques

Les données OpenStreetMap évoluent. Pour mettre à jour :

```bash
# 1. Supprimer l'ancien volume
docker volume rm globetrotter-lbv_osrm_data

# 2. Relancer la préparation
./scripts/osrm-prepare.sh

# 3. Redémarrer
docker-compose up -d
```
