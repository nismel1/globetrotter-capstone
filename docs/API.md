# Globetrotter API Documentation

## Overview

API Gateway expose tous les services via un point d'entrée unique (port 3000).

### Base URL

```
http://localhost:3000
```

### Authentication

Tous les endpoints protégés nécessitent un token JWT dans le header `Authorization` :

```
Authorization: Bearer <token>
```

---

## Auth Service

### POST `/auth/register`

Créer un nouvel utilisateur.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "fullName": "John Doe"
}
```

**Response (201):**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "token": "jwt-token",
  "message": "User registered successfully"
}
```

---

### POST `/auth/login`

Authentifier un utilisateur.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response (200):**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "token": "jwt-token",
  "message": "Login successful"
}
```

---

### GET `/auth/profile`

Récupérer le profil de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "John Doe",
  "avatarUrl": "https://...",
  "createdAt": "2026-08-17T10:00:00Z"
}
```

---

### PUT `/auth/preferences`

Mettre à jour les préférences utilisateur (résultats du quiz onboarding).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "timeAvailable": "week",
  "interests": ["nature", "culture", "food"],
  "budget": "moderate",
  "travelMode": "family",
  "ambientSoundEnabled": true
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "timeAvailable": "week",
  "interests": ["nature", "culture", "food"],
  "budget": "moderate",
  "travelMode": "family",
  "ambientSoundEnabled": true,
  "updatedAt": "2026-08-17T10:00:00Z"
}
```

---

### GET `/auth/passeport`

Récupérer le passeport (lieux visités + badges).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "visitedPlacesCount": 5,
  "badges": [
    {
      "id": "uuid",
      "name": "Explorateur",
      "description": "Visité 10 lieux",
      "iconUrl": "https://...",
      "category": "exploration"
    }
  ]
}
```

---

## Catalog Service

### GET `/catalog/places`

Récupérer les lieux publiés.

**Query Parameters:**
- `category` (string, optional) — Filter by category UUID
- `limit` (number, default 20)
- `offset` (number, default 0)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Baie des Rois",
    "slug": "baie-des-rois",
    "categoryId": "uuid",
    "description": "Vaste espace aménagé sur le front de mer...",
    "address": "Libreville, Gabon",
    "latitude": 0.4167,
    "longitude": 9.4667,
    "rating": 4.5,
    "reviewCount": 23,
    "priceLevel": "free",
    "openingHours": "Ouvert 24h/24",
    "coverImageUrl": "https://...",
    "isPublished": true,
    "createdAt": "2026-08-01T10:00:00Z"
  }
]
```

---

### GET `/catalog/places/:id`

Récupérer un lieu spécifique avec détails complets.

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Baie des Rois",
  "slug": "baie-des-rois",
  "categoryId": "uuid",
  "description": "Vaste espace aménagé sur le front de mer...",
  "longDescription": "Un excellent lieu pour...",
  "address": "Libreville, Gabon",
  "latitude": 0.4167,
  "longitude": 9.4667,
  "rating": 4.5,
  "reviewCount": 23,
  "priceLevel": "free",
  "openingHours": "Ouvert 24h/24",
  "phone": "+241...",
  "website": "https://...",
  "coverImageUrl": "https://...",
  "tags": [
    {
      "id": "uuid",
      "name": "Plage",
      "slug": "plage"
    }
  ],
  "gallery": [
    {
      "id": "uuid",
      "imageUrl": "https://...",
      "caption": "Vue générale",
      "displayOrder": 1
    }
  ],
  "sounds": [
    {
      "id": "uuid",
      "soundUrl": "https://...",
      "soundType": "ambient",
      "description": "Vagues et vent du large",
      "durationSeconds": 180
    }
  ],
  "createdAt": "2026-08-01T10:00:00Z"
}
```

---

### GET `/catalog/categories`

Récupérer toutes les catégories.

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Loisirs & Front de mer",
    "slug": "loisirs-front-de-mer",
    "description": "Plages, baies, activités aquatiques",
    "iconUrl": "https://...",
    "colorHex": "#1F4A45",
    "createdAt": "2026-08-01T10:00:00Z"
  }
]
```

---

### GET `/catalog/events`

Récupérer les événements à venir.

**Query Parameters:**
- `limit` (number, default 20)
- `offset` (number, default 0)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Festival du Vent",
    "description": "Célébration annuelle du vent marin",
    "placeId": "uuid",
    "placeName": "Baie des Rois",
    "startDate": "2026-09-15",
    "startTime": "10:00:00",
    "endDate": "2026-09-17",
    "endTime": "22:00:00",
    "imageUrl": "https://...",
    "isPublished": true,
    "createdAt": "2026-08-01T10:00:00Z"
  }
]
```

---

### POST `/catalog/proposals`

Soumettre une proposition de lieu.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Nouveau spot nature",
  "categoryId": "uuid",
  "description": "Un endroit sympa pour se détendre",
  "address": "123 Rue de Libreville",
  "latitude": 0.4167,
  "longitude": 9.4667,
  "phone": "+241...",
  "website": "https://...",
  "imageUrls": ["https://..."]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Nouveau spot nature",
  "status": "pending",
  "createdAt": "2026-08-17T10:00:00Z"
}
```

---

### GET `/catalog/proposals`

Récupérer ses propositions soumises.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Nouveau spot nature",
    "status": "pending",
    "createdAt": "2026-08-17T10:00:00Z",
    "updatedAt": "2026-08-17T10:00:00Z"
  }
]
```

---

## Itinerary Service

### POST `/itinerary/generate`

Générer un itinéraire à partir des réponses au quiz d'onboarding.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "quizAnswers": {
    "timeAvailable": "week",
    "interests": ["nature", "culture"],
    "budget": "moderate",
    "travelMode": "family"
  }
}
```

**Response (201):**
```json
{
  "itineraryId": "uuid",
  "message": "Itinerary generated successfully",
  "days": 5
}
```

---

### GET `/itinerary/itineraries`

Récupérer tous les itinéraires de l'utilisateur.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "name": "Mon itinéraire Libreville",
    "description": null,
    "startDate": "2026-09-01",
    "endDate": "2026-09-05",
    "isPublished": false,
    "createdFromQuiz": true,
    "createdAt": "2026-08-17T10:00:00Z"
  }
]
```

---

### GET `/itinerary/itineraries/:id`

Récupérer un itinéraire avec ses jours et activités.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "name": "Mon itinéraire Libreville",
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "days": [
    {
      "id": "uuid",
      "itineraryId": "uuid",
      "dayNumber": 1,
      "date": "2026-09-01",
      "title": "Jour 1",
      "notes": null,
      "activities": [
        {
          "id": "uuid",
          "itineraryDayId": "uuid",
          "placeId": "uuid",
          "activityOrder": 1,
          "startTime": "10:00:00",
          "endTime": "12:00:00",
          "notes": "Matin au bord de mer",
          "isCompleted": false,
          "createdAt": "2026-08-17T10:00:00Z"
        }
      ]
    }
  ],
  "createdAt": "2026-08-17T10:00:00Z"
}
```

---

### POST `/itinerary/itineraries/:itineraryId/days/:dayId/activities`

Ajouter une activité à un jour de l'itinéraire.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "placeId": "uuid",
  "activityOrder": 1,
  "startTime": "10:00:00",
  "endTime": "12:00:00",
  "notes": "Matin au bord de mer"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "itineraryDayId": "uuid",
  "placeId": "uuid",
  "activityOrder": 1,
  "startTime": "10:00:00",
  "endTime": "12:00:00",
  "notes": "Matin au bord de mer",
  "isCompleted": false,
  "createdAt": "2026-08-17T10:00:00Z"
}
```

---

## Recommendation Service

### GET `/recommendations/suggest`

Récupérer des recommandations personnalisées.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (number, default 5)

**Response (200):**
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "name": "Baie des Rois",
      "slug": "baie-des-rois",
      "description": "Vaste espace aménagé sur le front de mer...",
      "rating": 4.5,
      "coverImageUrl": "https://..."
    }
  ],
  "count": 5,
  "userId": "uuid"
}
```

---

## Analytics Service

### GET `/analytics/metrics`

Récupérer les métriques du jour (admin).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "todayMetrics": {
    "date": "2026-08-17",
    "totalVisitors": 42,
    "newUsers": 3,
    "placesPublished": 1,
    "proposalsReceived": 2,
    "itinerariesCreated": 5,
    "averageSessionDurationSeconds": 600
  },
  "recentEvents": [
    {
      "eventType": "place_view",
      "count": 127
    },
    {
      "eventType": "itinerary_created",
      "count": 5
    }
  ],
  "uniqueUsers": 38,
  "generatedAt": "2026-08-17T10:00:00Z"
}
```

---

### GET `/analytics/metrics/daily`

Récupérer les métriques des derniers jours.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (number, default 30)

**Response (200):**
```json
[
  {
    "date": "2026-08-17",
    "totalVisitors": 42,
    "newUsers": 3,
    "placesPublished": 1,
    "proposalsReceived": 2,
    "itinerariesCreated": 5
  }
]
```

---

## Health Checks

### GET `/health`

Vérifier que l'API Gateway est en fonctionnement.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-08-17T10:00:00Z"
}
```

---

## Error Responses

Tous les services retournent des erreurs au format :

```json
{
  "error": "Description du problème"
}
```

### Codes de statut courants

- `200` — OK
- `201` — Created
- `400` — Bad Request (paramètres invalides)
- `401` — Unauthorized (token manquant ou invalide)
- `404` — Not Found
- `409` — Conflict (ex: email déjà utilisé)
- `500` — Internal Server Error

---

## Rate Limiting

À implémenter (Phase 2+). Pour l'instant, pas de limite.

---

## CORS

Le gateway accepte les requêtes CORS de tous les domaines (à sécuriser en production).

---

## Exemples complets

### 1. Inscription et connexion

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'

# Response
# {
#   "userId": "550e8400-e29b-41d4-a716-446655440000",
#   "email": "user@example.com",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "message": "User registered successfully"
# }

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### 2. Récupérer les lieux

```bash
curl -X GET "http://localhost:3000/catalog/places?limit=10&offset=0"

# ou avec catégorie
curl -X GET "http://localhost:3000/catalog/places?category=uuid-category&limit=10"
```

### 3. Générer un itinéraire

```bash
curl -X POST http://localhost:3000/itinerary/generate \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-09-01",
    "endDate": "2026-09-05",
    "quizAnswers": {
      "timeAvailable": "week",
      "interests": ["nature", "culture"],
      "budget": "moderate",
      "travelMode": "family"
    }
  }'
```

---

Voir chaque service pour endpoints supplémentaires spécifiques à chaque phase.
