# Globetrotter — Architecture Technique Détaillée

---

## Vue d'ensemble générale

```
┌─────────────────────────────────────────────────────────────────┐
│                        UTILISATEURS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │        Frontend (Navigateur / Mobile)                   │    │
│  │  HTML5 + CSS3 + Vanilla JavaScript (390px mobile-first) │    │
│  │  SPA avec routeur simple                                │    │
│  │  Stockage: LocalStorage pour JWT + user                │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │                                         │
│  HTTP/HTTPS (port 3000) │                                         │
│                         ▼                                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │      API Gateway (Express.js + JWT)                    │    │
│  │  • Point d'entrée unique (port 4000)                   │    │
│  │  • Vérification JWT (token Bearer)                     │    │
│  │  • Routage vers microservices                          │    │
│  │  • CORS management                                     │    │
│  │  • Rate limiting (Phase 2+)                            │    │
│  └───┬────┬────┬────┬────┬────┬────────────────────────────┘    │
│       │    │    │    │    │    │                                 │
│       │    │    │    │    │    └──► (Groupe - Phase 4)           │
│       │    │    │    │    └───► Analytics Service (3005)        │
│       │    │    │    └────► Recommendation Service (3004)       │
│       │    │    └─────► Itinerary Service (3003)                │
│       │    └──────► Catalog Service (3002)                      │
│       └─────────► Auth Service (3001)                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  PostgreSQL Unique (port 5432)                          │    │
│  │  • Schema: auth                                         │    │
│  │  • Schema: catalog                                      │    │
│  │  • Schema: itinerary                                    │    │
│  │  • Schema: recommendation                               │    │
│  │  • Schema: analytics                                    │    │
│  │  • Schema: groups (Phase 4)                             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Storage (MinIO - Phase 3+)                            │    │
│  │  • Photos utilisateurs                                 │    │
│  │  • Vidéos / boucles                                    │    │
│  │  • Assets audio                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Docker Network: globetrotter-network (bridge)
```

---

## Services Backend

### 1. Auth Service (port 3001)

**Responsabilité** : Gestion d'identité complète

**Stack** : Express.js + PostgreSQL + JWT + Bcrypt

**Endpoints principaux** :
- `POST /register` — Créer compte
- `POST /login` — Authentifier
- `GET /users/:id` — Profil utilisateur
- `POST /users/:id/preferences` — Quiz/préférences
- `GET /users/:id/achievements` — Badges
- `POST /users/:id/visited-places` — Marquer lieu visité
- `POST /users/:id/favorites` — Ajouter favori

**Données** : Schema `auth`
- users
- user_preferences
- visited_places
- favorites
- user_achievements

**Sécurité** :
- Mot de passe hashé (Bcrypt 10 rounds)
- JWT signé (7j expiration)
- Pas de mot de passe en logs

---

### 2. Catalog Service (port 3002)

**Responsabilité** : Catalogue de lieux, modération, propositions

**Stack** : Express.js + PostgreSQL

**Endpoints principaux** :
- `GET /places` — Grille de lieux
- `GET /places/:id` — Détail lieu + tags
- `GET /categories` — Liste catégories
- `GET /events` — Événements
- `POST /places/propose` — Proposer lieu
- `GET /proposals/pending` — Admin: propositions en attente
- `PUT /proposals/:id/approve` — Admin: approuver
- `PUT /proposals/:id/reject` — Admin: rejeter

**Données** : Schema `catalog`
- categories
- tags / place_tags
- places
- events
- place_proposals
- place_stories (Phase 3)
- media_assets
- book_chapters

**Workflow modération** :
1. Utilisateur propose lieu (status: pending)
2. Admin reçoit notification
3. Admin approuve → Lieu créé + proposal status: approved
4. Utilisateur voit confirmation

---

### 3. Itinerary Service (port 3003)

**Responsabilité** : Création, gestion, génération d'itinéraires

**Stack** : Express.js + PostgreSQL

**Endpoints principaux** :
- `POST /itineraries` — Créer itinéraire
- `GET /itineraries/:id` — Itinéraire + jours + activités
- `GET /users/:user_id/itineraries` — Mes itinéraires
- `POST /itineraries/:id/days` — Ajouter jour
- `POST /days/:day_id/activities` — Ajouter activité
- `POST /itineraries/generate` — Générer depuis quiz

**Données** : Schema `itinerary`
- itineraries
- itinerary_days
- itinerary_activities

**Logique** :
- Quiz answers stockés en JSONB dans itinerary.quiz_answers
- Génération MVP : nombre jours = durée quiz, puis user ajoute lieux manuellement
- Phase 3+ : Génération intelligente basée sur préférences + contexte

---

### 4. Recommendation Service (port 3004)

**Responsabilité** : Suggestions personnalisées (Phase 1 MVP: simple scoring)

**Stack** : Express.js + PostgreSQL + calls à Catalog/Itinerary

**Endpoints principaux** :
- `GET /recommendations/:user_id` — Top 5 lieux suggérés
- `POST /interactions` — Logger action utilisateur
- `GET /trending` — Lieux populaires 30j
- `GET /trending/category/:cat` — Populaires par catégorie (Phase 2)

**Données** : Schema `recommendation`
- recommendation_logs (vue, visite, favori, dismiss)

**Algorithme MVP** :
1. Récupérer all places (non visitées)
2. Trier par rating DESC
3. Limiter top N

**Évolution Phase 3+** :
- Contexte (météo, heure, distance GPS)
- Scoring multi-critères
- Collaborative filtering
- Temps réel

---

### 5. Analytics Service (port 3005)

**Responsabilité** : Métriques agrégées pour admin, telemetry

**Stack** : Express.js + PostgreSQL

**Endpoints principaux** :
- `POST /events` — Logger événement
- `GET /metrics` — Dashboard: visiteurs, places, propositions
- `GET /metrics/range` — Métriques date range
- `GET /popular-places` — Top lieux visités
- `GET /engagement` — Taux d'engagement utilisateurs

**Données** : Schema `analytics`
- usage_events (raw events: login, place_visit, itinerary_created, etc.)
- daily_metrics (agrégation J)

**Événements trackés** :
- login
- register
- place_view
- place_visit
- favorite_add
- itinerary_create
- itinerary_complete
- propose_place
- badge_unlock

---

### 6. API Gateway (port 4000)

**Responsabilité** : Point d'entrée unique, orchestration

**Stack** : Express.js + JWT verification + Axios (appels services)

**Fonctions** :
- ✓ Authentification (vérify JWT avant forward)
- ✓ Routage (dispatch requête vers bon service)
- ✓ CORS (permettre localhost:3000)
- ✓ Gestion d'erreurs (standardisé)
- ✓ Health checks (GET /health)

**Flux requête** :
1. Client envoie `GET /api/places` + `Authorization: Bearer JWT`
2. Gateway vérifie JWT (valide? pas expiré?)
3. Gateway forward vers `http://catalog-service:3002/places`
4. Gateway retourne réponse au client

**Patterns** :
- Pas d'authentification requise : `/auth/register`, `/auth/login`
- Authentification requise : `/profile/*`, `/places` (GET), tout le reste

---

## Flow d'authentification

```
┌─────────────┐                                    ┌──────────────┐
│   Client    │                                    │  API Gateway │
│             │                                    │              │
└──────┬──────┘                                    └──────┬───────┘
       │                                                  │
       │ 1. POST /api/auth/login                         │
       │ {email, password}                               │
       ├─────────────────────────────────────────────────>│
       │                                                  │ 2. Forward to Auth Service
       │                                                  ├──────────────────┐
       │                                                  │  Auth Service    │
       │                                                  ├──────────────────┤
       │                                                  │ • Lookup user    │
       │                                                  │ • Verify pwd     │
       │                                                  │ • Sign JWT       │
       │                                                  │ • Return token   │
       │                                                  ├──────────────────┘
       │                                                  │ 3. Return token
       │ 4. Response: {token, user}                      │
       │<─────────────────────────────────────────────────┤
       │                                                  │
       │ 5. Store token in localStorage                  │
       │ 6. next() GET /api/profile                      │
       │ Authorization: Bearer {token}                   │
       ├─────────────────────────────────────────────────>│
       │                                                  │ 7. Verify JWT
       │                                                  │ • Decode token
       │                                                  │ • Check expiry
       │                                                  │ • Extract user_id
       │                                                  │
       │                                                  │ 8. Forward (incl. user_id)
       │                                                  ├──────────────────┐
       │                                                  │  Auth Service    │
       │                                                  ├──────────────────┤
       │                                                  │ • Lookup profile │
       │                                                  │ • Return user    │
       │                                                  ├──────────────────┘
       │                                                  │ 9. Return profile
       │ 10. Response: {id, email, name}                 │
       │<─────────────────────────────────────────────────┤
       │                                                  │
```

---

## Communication inter-services

### Synchrone (REST + HTTP)

**Direction: Via API Gateway**
```
Client → API Gateway → Auth/Catalog/Itinerary/...
```
- Tous les appels utilisateurs passent par le gateway
- JWT vérifié une fois au gateway, pas re-validé par chaque service
- Services font confiance au header `user_id` attaché par le gateway

**Direction: Service-to-Service**
```
Recommendation Service → Catalog Service
                     → Itinerary Service
```
- Appels directs HTTP (pas via gateway)
- Pas d'authentification requise (réseau Docker interne, privé)
- URLs internes: `http://catalog-service:3002`, `http://itinerary-service:3003`

Exemple (recommendation-service):
```javascript
const catalogUrl = 'http://catalog-service:3002';
const response = await axios.get(`${catalogUrl}/places?limit=100`);
```

### Asynchrone (Future - Phase 2+)

**Option 1: Message Queue (RabbitMQ / Apache Kafka)**

Événements publiés:
- user.registered
- place.visited
- badge.unlocked
- itinerary.created

Consommateurs:
- Analytics service listen user.registered → increment daily_metrics
- Recommendation service listen place.visited → update logs

**Option 2: Event Sourcing**

Chaque action = événement immutable dans audit log.

---

## Modèle de données - Schémas isolés

**Règle fondamentale** : Aucune clé étrangère SQL entre schémas

```
┌──────────────────────────────────────────────────────────────────┐
│ PostgreSQL Instance: globetrotter                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: auth (auth-service)                                │ │
│ │ ├─ users (PK: uuid)                                        │ │
│ │ ├─ user_preferences (FK: user_id → users)                 │ │
│ │ ├─ visited_places (FK: user_id → users, place_id: UUID)   │ │
│ │ ├─ favorites (FK: user_id → users, place_id: UUID)        │ │
│ │ └─ user_achievements (FK: user_id → users)                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: catalog (catalog-service)                          │ │
│ │ ├─ categories (PK: uuid)                                   │ │
│ │ ├─ places (PK: uuid, FK: category_id → categories)        │ │
│ │ ├─ tags (PK: uuid, FK: category_id → categories)          │ │
│ │ ├─ place_tags (FK: place_id, tag_id)                      │ │
│ │ ├─ events (PK: uuid, FK: place_id → places)               │ │
│ │ ├─ place_proposals (PK: uuid, FK: category_id, user_id)   │ │
│ │ ├─ place_stories (PK: uuid, FK: place_id, user_id)        │ │
│ │ ├─ media_assets                                            │ │
│ │ └─ book_chapters                                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: itinerary (itinerary-service)                      │ │
│ │ ├─ itineraries (PK: uuid, FK: user_id → auth.users)       │ │
│ │ ├─ itinerary_days (PK: uuid, FK: itinerary_id)            │ │
│ │ └─ itinerary_activities (FK: day_id, place_id: UUID)      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: recommendation (recommendation-service)            │ │
│ │ └─ recommendation_logs (user_id, place_id: UUID, action)   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: analytics (analytics-service)                      │ │
│ │ ├─ usage_events (user_id, event_type, metadata)            │ │
│ │ └─ daily_metrics (aggregated stats)                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Schema: groups (group-service - Phase 4)                   │ │
│ │ ├─ groups (PK: uuid, FK: creator_id → auth.users)         │ │
│ │ ├─ group_members (FK: group_id, user_id → auth.users)     │ │
│ │ └─ group_votes (FK: group_id, user_id, place_id: UUID)    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Références entre schémas** : UUIDs stockés, jamais de FK SQL

Exemple : `auth.visited_places.place_id` → UUID pointant vers `catalog.places.id`
- Pas de `REFERENCES catalog.places(id)` en SQL
- Validation applicative dans catalog-service GET /places/:id

---

## Déploiement & Orchestration

### Local (Docker Compose)

1. Tous les services dans `docker-compose.yml`
2. Network: `globetrotter-network` (bridge)
3. Service discovery: DNS Docker (ex: `auth-service` résout vers IP du conteneur)
4. Volumes: `postgres_data` pour persistence

### Production (Kubernetes - Future)

Chaque service = 1 Pod
- Replica set: 2-3 replicas par service
- Service: ClusterIP (internal) + LoadBalancer (gateway)
- ConfigMap: variables d'env non-secrètes
- Secret: JWT_SECRET, DB_PASSWORD
- PVC: postgres_data (20GB)
- Ingress: routage externe (HTTPS)

---

## Sécurité par défaut

1. **Authentification** : JWT signé, expiration 7j
2. **Autorisation** : Vérification user_id dans requête vs token
3. **SQL Injection** : Prepared statements (pg library)
4. **XSS** : Pas de templates côté serveur (API Rest)
5. **CSRF** : Pas d'état session (JWT stateless)
6. **CORS** : Restreint à localhost:3000
7. **Secrets** : Jamais dans code (via .env + env vars Docker)
8. **Logs** : Jamais de mot de passe, token, PII sensible

---

## Monitoring & Observabilité

### Phase 1 (MVP)
- Health checks simples (`GET /health`)
- Logs stdout (Docker capture)

### Phase 2+
- Structured logging (JSON format)
- Tracing distribué (Jaeger optional)
- Metrics (Prometheus)
- Alertes (Alertmanager)

---

## Performance & Scalabilité

### Actuellement (Phase 1)
- Simple: 1 réplica par service
- DB: connexion directe

### Phase 2+
- Multi-réplica avec load balancer
- Connection pooling (PgBouncer)
- Cache (Redis pour cache de requêtes fréquentes)
- CDN pour assets statiques
- Compression (Gzip)

---

## Déploiement par phase

| Phase | Stack | Déploiement | Base données |
|-------|-------|-------------|--------------|
| 1 | Node.js 18 + Express | Docker Compose | PostgreSQL single |
| 2+ | Node.js 18 + Express | Kubernetes | PostgreSQL + replicas |
| 3+ | (idem) + MinIO | K8s | PostgreSQL + MinIO |
| 4+ | (idem) | K8s multi-zone | PostgreSQL + MinIO |
