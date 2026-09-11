# Globetrotter Backend

Microservices architecture pour l'application Globetrotter — un carnet de voyage personnalisé pour la découverte de Libreville.

## Architecture

### Services

- **api-gateway** (port 3000) : Point d'entrée unique, routage, vérification JWT
- **auth-service** (port 3001) : Authentification, profils, passeport, badges
- **catalog-service** (port 3002) : Lieux, catégories, tags, événements, propositions, modération
- **itinerary-service** (port 3003) : Itinéraires, jours, activités
- **recommendation-service** (port 3004) : Suggestions personnalisées (actuellement simple, Phase 3 = contextuel)
- **analytics-service** (port 3005) : Métriques agrégées pour l'admin

### Base de données

PostgreSQL 15 unique avec schémas isolés par service (aucune clé étrangère SQL entre schémas).

```
- auth         → Comptes, préférences, passeport, badges
- catalog      → Lieux, événements, propositions, modération
- itinerary    → Itinéraires, jours, activités
- recommendation → Logs de recommandations
- analytics    → Événements d'usage, métriques
- groups       → [Phase 4] Sorties de groupe, votes
```

## Démarrage rapide

### Prérequis

- Docker & Docker Compose
- Node.js 18+ (optionnel, pour développement local)
- PostgreSQL 15 (optionnel, via Docker)

### Lancer l'application

```bash
cd backend
docker-compose up --build
```

Services seront disponibles sur :
- API Gateway : http://localhost:3000
- Auth Service : http://localhost:3001
- Catalog Service : http://localhost:3002
- Itinerary Service : http://localhost:3003
- Recommendation Service : http://localhost:3004
- Analytics Service : http://localhost:3005
- PostgreSQL : localhost:5432

### Variables d'environnement

Créer `.env` à la racine du projet backend :

```env
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development

AUTH_SERVICE_URL=http://auth-service:3001
CATALOG_SERVICE_URL=http://catalog-service:3002
ITINERARY_SERVICE_URL=http://itinerary-service:3003
RECOMMENDATION_SERVICE_URL=http://recommendation-service:3004
ANALYTICS_SERVICE_URL=http://analytics-service:3005

# PostgreSQL
POSTGRES_DB=globetrotter
POSTGRES_USER=globetrotter_user
POSTGRES_PASSWORD=globetrotter_pass
```

## Développement local

Chaque service peut être développé indépendamment :

```bash
cd services/auth-service
npm install
npm run dev  # ts-node avec hot-reload
```

Ou compiler vers production :

```bash
npm run build
npm start
```

## Structure du projet

```
backend/
├── docker-compose.yml          # Orchestration des services
├── database/
│   └── init.sql               # DDL complet PostgreSQL
├── services/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   └── index.ts       # Routage et JWT
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── auth-service/
│   │   ├── src/
│   │   │   └── index.ts       # Auth, profils, passeport
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── catalog-service/
│   │   ├── src/
│   │   │   └── index.ts       # Lieux, événements, propositions
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── itinerary-service/
│   │   ├── src/
│   │   │   └── index.ts       # Itinéraires, jours, activités
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── recommendation-service/
│   │   ├── src/
│   │   │   └── index.ts       # Suggestions (Phase 3 = contextuel)
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── analytics-service/
│       ├── src/
│       │   └── index.ts       # Événements, métriques admin
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
└── README.md
```

## Communication entre services

### Synchrone (REST via Gateway)

```
Client → API Gateway → [Service A, B, C, ...]
```

JWT vérifié au gateway avant transmission.

### Service-to-Service (direct)

`recommendation-service` appelle `catalog-service` et `itinerary-service` directement, sans passer par le gateway.

### Pas de broker (pour l'instant)

Pas de Kafka/RabbitMQ au MVP — trop complexe. À réintroduire seulement si besoin de :
- Notifications temps réel
- Pipelines analytics asynchrones
- Événements domaine décorrélés

## Modèle de données

### Phase 1 (MVP)

- Utilisateurs, authentification, préférences (quiz onboarding)
- Lieux publiés, catégories, tags
- Propositions de lieux (en attente / approuvé / rejeté)
- Itinéraires générés, jours, activités
- Passeport simple (compteur visites + badges)
- Événements du jour

### Phase 2

- Missions (défis par catégorie)
- Progression missions par utilisateur
- [Souvenirs partageables générés côté client]

### Phase 3

- Contributions d'habitants (récits, photos)
- Modération contributions
- Logs recommandations (tracking)
- [Contextuel : suggestions heure/météo/événements/distance]
- [MinIO ajouté pour stockage photos]

### Phase 4

- Groupes, membres, invitation
- Votes sur destinations (polling)
- Résultat vote calculé

## Roadmap infrastructure

### Phase 1 (MVP)

- ✅ Docker Compose local
- ✅ PostgreSQL unique, schémas isolés
- ✅ JWT via gateway
- Services REST de base

### Phase 2

- Profiling / optimisation requêtes
- Cache Redis (optionnel)

### Phase 3

- MinIO pour stockage d'objets
- Considérer partitionnement BD si data volumineuse

### Phase 4

- Mode polling groupe (implémenté en client-side)
- Éventuellement : websockets si voting temps réel souhaité

## Notes de sécurité

- JWT signé avec secret fort — **CHANGER en production**
- Pas de CORS ouvert — adapter à domaine frontend
- Pas de données sensibles en logs
- Vérifier intégrité des tokens au gateway
- Valider inputs (ORM ou prepared statements)

## Troubleshooting

### Les services ne communiquent pas

Vérifier que tous les `depends_on` et healthchecks passent :

```bash
docker-compose ps
docker-compose logs [service-name]
```

### JWT invalide

Vérifier que `JWT_SECRET` est le même dans tous les services.

### Migrations de BD

Éditer `database/init.sql`, puis :

```bash
docker-compose down -v  # Supprime volume PostgreSQL
docker-compose up --build
```

### Port déjà en usage

Modifier les ports dans `docker-compose.yml`.

## Prochain développement

Voir `Globetrotter_Synthese_Complete.docx` — section « Prochaines étapes » — pour détails sur :
- Maquettes écrans restants
- Choix validation visite (déclaratif vs géolocalisé)
- Stack technique par service
- Sourcing contenus (photos historiques, sons, vidéos)
- Modèle de données détaillé final

## Support

Lire la synthèse produit pour contexte complet sur les phases, l'architecture produit, et les décisions design.
