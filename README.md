# Globetrotter — Plateforme touristique Libreville

Guide touristique + assistant IA + planificateur de voyage + journal de voyage + réseau social, centré sur Libreville, Gabon.

> **Statut réel du projet (voir `AUDIT_GLOBETROTTER_V2.md`) :** l'application démarre et couvre l'essentiel du parcours utilisateur (auth, exploration, itinéraires, groupes, IA), mais n'est **pas encore production-ready** : pas de tests, pas de Redis/RabbitMQ, secrets à régénérer, messagerie/notifications en cours d'intégration. Ne pas considérer cette base comme un MVP figé — c'est un projet vivant en cours de stabilisation.

## 📋 Vue d'ensemble

- **Architecture** : microservices dockerisés, une base PostgreSQL avec un schéma par service
- **Frontend** : **React 18 + Vite**, cartes **Leaflet/react-leaflet**, calendrier **FullCalendar**, i18n **i18next** (FR/EN)
- **Backend** : services REST Node.js/Express, communication interservices en HTTP interne (Docker network)
- **Base de données** : PostgreSQL 15
- **Recherche** : Elasticsearch (conteneur présent, intégration effective à confirmer)
- **Routing** : OSRM (carte OpenStreetMap Gabon)

## 🏗️ Architecture réelle

```
                         FRONTEND (React/Vite)
                                │
                                ▼
                          API GATEWAY (:4000)
                    (JWT, CORS, helmet, rate limiting)
                                │
        ┌──────────┬───────────┼───────────┬──────────────┬───────────┐
        ▼          ▼           ▼           ▼              ▼           ▼
   auth-service catalog-  itinerary-  recommendation- analytics-  chatbot-
    (:3001)   service(:3002) service(:3003) service(:3004) service(:3005) service(:3006)
        │          │           │
        └──────────┴───────────┴──── group-service (:3007)
                                       │
                          message-service (:3008) ──▶ notification-service (:3009)
                                (nouveaux — voir note ci-dessous)

   Infra partagée : PostgreSQL (:5432) · Elasticsearch (:9200) · OSRM (:5000)
```

> **`message-service` et `notification-service`** ont été spécifiés et codés (schémas SQL, endpoints REST, WebSocket temps réel) mais ne sont pas encore branchés dans `docker-compose.yml` / `api-gateway` de ce dépôt tant que vous n'avez pas collé les fichiers fournis. Une fois intégrés, retirez cette note.

Services **prévus par l'architecture cible mais non encore implémentés** : cache/rate-limiting distribué (Redis), bus d'événements asynchrone (RabbitMQ) pour découpler notifications/analytics/gamification du flux principal.

## 📁 Structure du projet

```
globetrotter/
├── frontend/                      # React 18 + Vite
│   ├── src/
│   │   ├── pages/                 # LoginPage, HomePage, ExplorerPage, ItineraryPage,
│   │   │                          # GroupPage, EventsPage, MyHistoryPage, ProfilePage,
│   │   │                          # ProposePage, AdminPage, PatrimoinePage, DefisPage,
│   │   │                          # SharedItineraryPage
│   │   ├── components/            # PlaceMap, RouteMap, WeatherWidget, EventCalendar,
│   │   │                          # DestinationChatbot, InlineItineraryChatbot,
│   │   │                          # GroupDashboard/Voting/Outings, NotificationBell,
│   │   │                          # AudioManager/Player, LanguageSwitcher, SearchBar...
│   │   ├── context/                # AuthContext, AudioContext, NotificationContext
│   │   ├── api/                    # geocoding.js, photos.js, tracking.js
│   │   ├── locales/                 # fr.json, en.json (i18next)
│   │   └── styles/                  # tokens.css, base.css, components.css, navbar.css...
│   ├── nginx.conf / nginx-default.conf
│   └── vite.config.js
├── backend/
│   ├── api-gateway/                # Routage, JWT, CORS, helmet, rate limiting
│   ├── auth-service/                # Inscription, connexion, profil, favoris, badges
│   ├── catalog-service/             # Lieux, catégories, événements, audios, propositions
│   ├── itinerary-service/           # Itinéraires, jours, activités
│   ├── recommendation-service/      # Suggestions
│   ├── analytics-service/           # Métriques, événements d'usage
│   ├── chatbot-service/             # Assistant IA (OpenRouter)
│   ├── group-service/               # Groupes, votes, dépenses partagées
│   ├── message-service/             # Messagerie (à intégrer — voir note ci-dessus)
│   ├── notification-service/        # Notifications temps réel (à intégrer)
│   └── database/
│       ├── init.sql                 # DDL (schémas auth, catalog, itinerary,
│       │                            #  recommendation, analytics, groups)
│       └── globetrotter_destinations_libreville_short_ids.sql
├── docker-compose.yml
└── docs/
```

## 🚀 Démarrage

### Avec Docker (recommandé)

```bash
# 1. Copier les fichiers d'environnement et générer de vrais secrets
cp backend/.env.example .env
# éditer .env : JWT_SECRET, DB_PASSWORD, INTERNAL_SERVICE_KEY
# générer avec : openssl rand -base64 48

# 2. Construire et démarrer
docker-compose build
docker-compose up -d

# 3. Vérifier
docker-compose ps
docker-compose logs -f
```

Accès :
- Frontend : http://localhost:3200
- API Gateway : http://localhost:4000
- PostgreSQL : localhost:5432 (interne au réseau Docker, non exposé par défaut)

### En développement local (sans Docker, service par service)

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
cd backend/auth-service && npm install && npm run dev
cd backend/catalog-service && npm install && npm run dev
# ... idem pour chaque service, ports 3001 à 3009
```

⚠️ **Avant tout démarrage en développement**, `docker-compose up postgres` seul pour disposer de la base, puis exécuter `backend/database/init.sql` (et `002_message_notification_schema.sql` une fois disponible).

## ⚠️ Sécurité — à faire avant toute mise en production

- **Régénérer `JWT_SECRET` et le mot de passe PostgreSQL** : les valeurs présentes dans l'historique du projet ont circulé en clair dans `docker-compose.yml` et `.env.example` et doivent être considérées comme compromises.
- Ne jamais committer de fichier `.env` réel (seuls les `.env.example` avec des placeholders doivent être versionnés).
- Voir `AUDIT_GLOBETROTTER_V2.md` pour la liste complète des points de sécurité et d'infrastructure à traiter avant production.

## 📚 Documentation

- `AUDIT_GLOBETROTTER_V2.md` — état réel du projet, problèmes identifiés, plan de correction
- `backend/API.md` — spécification REST *(à vérifier/mettre à jour service par service)*
- `backend/DATABASE.md` — modèle de données *(à vérifier/mettre à jour)*
- `backend/DEPLOYMENT.md` — Docker et déploiement *(à vérifier/mettre à jour)*

## 🎯 État des grands domaines fonctionnels

| Domaine | État |
|---|---|
| Authentification (inscription, connexion, profil) | ✅ Fonctionnel |
| Exploration, lieux, événements, propositions | ✅ Fonctionnel |
| Itinéraires manuels | ✅ Fonctionnel (routing OSRM à vérifier) |
| Assistant IA / chatbot | ✅ Présent, garde-fous anti-hallucination et permissions à auditer |
| Groupes (votes, dépenses partagées) | ✅ Fonctionnel côté backend |
| Gamification (badges, missions) | 🟡 Tables présentes, logique de progression à vérifier |
| Messagerie temps réel | 🟡 Codée, non encore intégrée au dépôt (voir `message-service/`) |
| Notifications temps réel | 🟡 Codée, non encore intégrée au dépôt (voir `notification-service/`) |
| Réseau social (fil, likes, commentaires) | ❌ Non trouvé dans le code actuel |
| Import externe de lieux | ❌ Non trouvé dans le code actuel |
| Cache / rate limiting distribué (Redis) | ❌ Absent |
| Bus d'événements asynchrone (RabbitMQ) | ❌ Absent |
| Tests (unitaires, intégration, E2E) | ❌ Absent |

## 📄 Licence

Confidentiel — Projet interne.