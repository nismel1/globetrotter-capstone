# Globetrotter — Synthèse du projet

**Dernière mise à jour de ce document** : Septembre 2026
**Statut réel** : base fonctionnelle multi-services, **non production-ready** — voir `AUDIT_GLOBETROTTER_V2.md` pour le détail complet.

---

## ⚠️ Pourquoi ce document a été réécrit

La version précédente de ce fichier décrivait un frontend "HTML5 + CSS3 + JavaScript vanilla" en "Phase 1 (MVP) — Implémentation complète". Ce n'est plus (et n'était peut-être déjà plus) le cas : le frontend réel est une application **React 18 / Vite**, et plusieurs domaines annoncés comme "✅" n'ont pas de tests ni de vérification fonctionnelle. Ce document décrit l'état **constaté par audit direct du code**, pas l'état visé.

---

## 📌 Ce qui existe réellement

### Structure du projet

```
globetrotter/
├── backend/
│   ├── api-gateway/            ✅ Routeur, JWT, CORS, helmet, rate limiting, HPP
│   ├── auth-service/            ✅ Inscription, connexion (bcrypt+JWT), profil, favoris, badges
│   ├── catalog-service/         ✅ Lieux, catégories, événements, audios, propositions
│   ├── itinerary-service/       ✅ Itinéraires, jours, activités
│   ├── recommendation-service/  ✅ Suggestions
│   ├── analytics-service/       ✅ Metrics, usage_events
│   ├── chatbot-service/         🟡 Assistant IA (OpenRouter) — garde-fous à auditer
│   ├── group-service/           🟡 Groupes, votes, dépenses — pas de healthcheck Docker
│   ├── message-service/         🟡 Codé (voir livraison précédente), non encore intégré au dépôt
│   └── notification-service/    🟡 Codé (voir livraison précédente), non encore intégré au dépôt
├── frontend/
│   ├── src/pages/                ✅ 13 pages React (Login, Home, Explorer, Itinerary, Group,
│   │                              Events, MyHistory, Profile, Propose, Admin, Patrimoine,
│   │                              Defis, SharedItinerary)
│   ├── src/components/           ✅ ~24 composants (cartes, calendrier, chatbot, groupes,
│   │                              météo, audio, notifications, i18n...)
│   ├── src/context/               ✅ AuthContext, AudioContext, NotificationContext
│   ├── src/locales/                ✅ fr.json, en.json (i18next)
│   ├── src/styles/                  ✅ Design system (tokens.css, base.css, components.css...)
│   └── nginx.conf                   ✅ Serveur statique + proxy /api + headers sécurité
├── database/
│   └── init.sql                    ✅ DDL — 6 schémas (auth, catalog, itinerary,
│                                     recommendation, analytics, groups)
├── docker-compose.yml               🟡 9 services applicatifs + Postgres + Elasticsearch + OSRM
│                                     — Redis/RabbitMQ absents, healthchecks incomplets
└── docs/ (backend/API.md, DATABASE.md, DEPLOYMENT.md — à vérifier/actualiser)
```

Légende : ✅ présent et cohérent avec son usage apparent · 🟡 présent mais avec des réserves (voir `AUDIT_GLOBETROTTER_V2.md`) · ❌ absent.

### Base de données

**6 schémas PostgreSQL actifs** (+ 2 schémas `message` / `notification` prêts, script fourni séparément) :

1. **auth** — utilisateurs, préférences, badges, achievements, lieux visités, favoris
2. **catalog** — lieux, catégories, tags, événements, propositions, audios, missions, contributions locales
3. **itinerary** — itinéraires, jours, activités
4. **recommendation** — logs d'interactions
5. **analytics** — usage_events, daily_metrics
6. **groups** — groupes, membres, votes, dépenses partagées

Convention respectée dans tout le code audité : **aucune foreign key entre schémas** — les références interservices sont des UUID validés au niveau applicatif, conformément à l'architecture cible.

### Backend (9 microservices Node.js/Express)

| Service | Port | Responsabilité | État |
|---|---|---|---|
| **api-gateway** | 4000 | Routage, JWT, sécurité HTTP | ✅ |
| **auth-service** | 3001 | Authentification, profil, badges | ✅ |
| **catalog-service** | 3002 | Catalogue, événements, propositions | ✅ |
| **itinerary-service** | 3003 | Itinéraires, jours, activités | ✅ |
| **recommendation-service** | 3004 | Suggestions | ✅ |
| **analytics-service** | 3005 | Métriques | ✅ |
| **chatbot-service** | 3006 | Assistant IA | 🟡 pas de healthcheck Docker |
| **group-service** | 3007 | Groupes, votes, dépenses | 🟡 pas de healthcheck Docker |
| **message-service** | 3008 | Conversations, messages, WebSocket | 🟡 non intégré au dépôt |
| **notification-service** | 3009 | Notifications, WebSocket | 🟡 non intégré au dépôt |

Chaque service audité dispose de : Express.js, Dockerfile, variables d'env via `.env`, gestion d'erreurs basique. Healthcheck Docker présent uniquement sur `auth`, `catalog`, `itinerary`, `recommendation`, `analytics`, `api-gateway`.

### Frontend (React 18 + Vite)

| Page | Route probable | Notes |
|---|---|---|
| Login | `/` | Inscription/connexion |
| Home | `/home` | Accueil |
| Explorer | `/explorer` | Recherche/filtre de lieux |
| Itinerary | `/itinerary` | Gestion itinéraires |
| Group | `/group` | Groupes, votes, dépenses |
| Events | `/events` | Calendrier (FullCalendar) |
| MyHistory | `/my-history` | Journal de voyage / souvenirs |
| Profile | `/profile` | Profil, badges, favoris |
| Propose | `/propose` | Proposer un lieu |
| Admin | `/admin` | Administration |
| Patrimoine, Defis, SharedItinerary | — | Contenus additionnels |

Technologie confirmée par lecture de `frontend/package.json` : React 18, React Router 6, Vite 5, Leaflet/react-leaflet, FullCalendar, i18next, Heroicons. **Aucune trace de framework "vanilla JS" dans le code actuel.**

⚠️ Non vérifié dans cet audit (à faire page par page) : états loading/error/empty réels, responsive sur les points de rupture 320–1440px, absence de style inline, couverture des appels API.

### DevOps & Déploiement

- 🟡 `docker-compose.yml` : 9 services applicatifs + PostgreSQL + Elasticsearch + OSRM. Redis et RabbitMQ **absents**. Healthchecks incomplets, `depends_on` sans condition `service_healthy`.
- ❌ Secrets en clair dans `docker-compose.yml` et `.env.example` — **à régénérer avant toute mise en production**, voir `AUDIT_GLOBETROTTER_V2.md` §1.1.
- ❌ Aucun `docker-compose.prod.yml` ni séparation dev/test/prod constatée.

### Documentation

| Fichier | État |
|---|---|
| `README.md` | ✅ Réécrit (voir livraison associée) |
| `PROJECT_SUMMARY.md` | ✅ Ce fichier, réécrit |
| `AUDIT_GLOBETROTTER_V2.md` | ✅ Audit détaillé, preuve à l'appui |
| `backend/API.md` | 🟡 Existe, contenu non vérifié — à auditer |
| `backend/DATABASE.md` | 🟡 Existe, contenu non vérifié — à auditer |
| `backend/DEPLOYMENT.md` | 🟡 Existe, contenu non vérifié — à auditer |
| `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md` | ❌ Non trouvés — à créer |

---

## 🚧 Ce qui manque pour la production (résumé — détail dans l'audit)

- Secrets à régénérer et externaliser proprement.
- Redis (cache, rate limiting distribué) et RabbitMQ (découplage asynchrone notifications/analytics/gamification).
- Intégration effective de `message-service` et `notification-service` dans `docker-compose.yml` et l'API Gateway.
- Healthchecks Docker complets + `depends_on: condition: service_healthy` partout.
- Tests unitaires, d'intégration et E2E (actuellement absents).
- Vérification/mise à jour de `backend/API.md`, `DATABASE.md`, `DEPLOYMENT.md`.
- Audit fonctionnel page par page du frontend (états de chargement/erreur, responsive, accessibilité).
- Décision sur Elasticsearch (intégrer réellement la recherche ou retirer le service).

---

## 🚀 Prêt pour

Développement continu et stabilisation progressive — **pas encore pour une mise en production**. Suivre l'ordre de travail recommandé dans `AUDIT_GLOBETROTTER_V2.md` §5.