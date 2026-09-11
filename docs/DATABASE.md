# Globetrotter Database Schema

## Overview

PostgreSQL 15 avec schémas isolés par microservice. Aucune clé étrangère SQL entre schémas — toutes les références sont logiques (UUID) vérifiées au niveau applicatif.

## Schemas

### `auth` — Authentication Service

Gère les comptes utilisateur, authentification JWT, préférences, passeport et badges.

#### Tables

**users**
```sql
id (UUID)              -- Primary key
email (VARCHAR)        -- Unique, indexed
password_hash (VARCHAR)
full_name (VARCHAR)
avatar_url (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
is_active (BOOLEAN)
last_login_at (TIMESTAMP)
```

**user_preferences**
```sql
id (UUID)
user_id (UUID)         -- FK to users
time_available (VARCHAR)     -- 'weekend', 'week', 'fortnight', 'month'
interests (TEXT[])     -- Array of interest tags
budget (VARCHAR)       -- 'free', 'low', 'medium', 'high'
travel_mode (VARCHAR)  -- 'solo', 'couple', 'family', 'group'
ambient_sound_enabled (BOOLEAN)  -- Default false
language (VARCHAR)     -- Default 'fr'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**badges**
```sql
id (UUID)
name (VARCHAR)
description (TEXT)
icon_url (TEXT)
requirement_count (INTEGER)  -- Places to visit for badge
category (VARCHAR)
created_at (TIMESTAMP)
```

**user_achievements**
```sql
id (UUID)
user_id (UUID)         -- FK to users
badge_id (UUID)        -- FK to badges
achieved_at (TIMESTAMP)
```

**visited_places**
```sql
id (UUID)
user_id (UUID)         -- FK to users
place_id (UUID)        -- Reference to catalog.places (logical)
visited_at (TIMESTAMP)
is_favorite (BOOLEAN)
rating (INTEGER)       -- 1-5
personal_note (TEXT)
```

**favorites**
```sql
id (UUID)
user_id (UUID)         -- FK to users
place_id (UUID)        -- Reference to catalog.places (logical)
added_at (TIMESTAMP)
```

---

### `catalog` — Catalog Service

Gère les lieux, catégories, tags, événements, propositions et modération.

#### Tables

**categories**
```sql
id (UUID)
name (VARCHAR)
slug (VARCHAR)         -- Unique, URL-friendly
description (TEXT)
icon_url (TEXT)
color_hex (VARCHAR)    -- Palette Globetrotter
created_at (TIMESTAMP)
```

**tags**
```sql
id (UUID)
name (VARCHAR)
slug (VARCHAR)         -- Unique
category_id (UUID)     -- FK to categories
created_at (TIMESTAMP)
```

**places**
```sql
id (UUID)              -- Primary key
name (VARCHAR)
slug (VARCHAR)         -- Unique, URL-friendly
category_id (UUID)     -- FK to categories
description (TEXT)
long_description (TEXT)
address (VARCHAR)
latitude (DECIMAL)
longitude (DECIMAL)
rating (DECIMAL)       -- Computed or from reviews
review_count (INTEGER)
price_level (VARCHAR)  -- 'free', 'cheap', 'moderate', 'expensive'
opening_hours (TEXT)
phone (VARCHAR)
website (VARCHAR)
cover_image_url (TEXT)
is_published (BOOLEAN) -- Contrôle visibilité
last_verified_at (TIMESTAMP)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**place_tags**
```sql
id (UUID)
place_id (UUID)        -- FK to places
tag_id (UUID)          -- FK to tags
```

**place_gallery**
```sql
id (UUID)
place_id (UUID)        -- FK to places
image_url (TEXT)
caption (TEXT)
display_order (INTEGER)
created_at (TIMESTAMP)
```

**place_sounds** (Phase 1+)
```sql
id (UUID)
place_id (UUID)        -- FK to places
sound_url (TEXT)       -- Ambiance audio (3-6s boucle)
sound_type (VARCHAR)   -- 'ambient', 'nature', 'urban', 'music'
description (TEXT)
duration_seconds (INTEGER)
created_at (TIMESTAMP)
```

**events**
```sql
id (UUID)
name (VARCHAR)
description (TEXT)
place_id (UUID)        -- FK to places
start_date (DATE)
start_time (TIME)
end_date (DATE)
end_time (TIME)
image_url (TEXT)
is_published (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**place_proposals** (Contributions utilisateurs)
```sql
id (UUID)
user_id (UUID)         -- Reference to auth.users (logical)
name (VARCHAR)
category_id (UUID)     -- FK to categories
description (TEXT)
address (VARCHAR)
latitude (DECIMAL)
longitude (DECIMAL)
phone (VARCHAR)
website (VARCHAR)
image_urls (TEXT[])
status (VARCHAR)       -- 'pending', 'approved', 'rejected', 'revision_requested'
admin_notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
reviewed_at (TIMESTAMP)
reviewed_by (UUID)     -- Reference to auth.users (logical, admin)
```

**place_stories** (Phase 3 — Contributions d'habitants)
```sql
id (UUID)
place_id (UUID)        -- FK to places
user_id (UUID)         -- Reference to auth.users (logical)
title (VARCHAR)
story_text (TEXT)
image_urls (TEXT[])
status (VARCHAR)       -- 'pending', 'approved', 'rejected'
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
reviewed_at (TIMESTAMP)
reviewed_by (UUID)     -- Reference to auth.users (logical, admin)
```

**missions** (Phase 2)
```sql
id (UUID)
name (VARCHAR)
description (TEXT)
category_id (UUID)     -- FK to categories
required_place_count (INTEGER)
icon_url (TEXT)
reward_text (TEXT)
is_active (BOOLEAN)
created_at (TIMESTAMP)
```

**user_missions** (Phase 2)
```sql
id (UUID)
user_id (UUID)         -- Reference to auth.users (logical)
mission_id (UUID)      -- FK to missions
started_at (TIMESTAMP)
completed_at (TIMESTAMP)
places_completed (INTEGER)
```

---

### `itinerary` — Itinerary Service

Gère les itinéraires, jours et activités.

#### Tables

**itineraries**
```sql
id (UUID)
user_id (UUID)         -- Reference to auth.users (logical)
name (VARCHAR)
description (TEXT)
start_date (DATE)
end_date (DATE)
is_published (BOOLEAN)
created_from_quiz (BOOLEAN)  -- Généré par onboarding quiz
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**itinerary_days**
```sql
id (UUID)
itinerary_id (UUID)    -- FK to itineraries
day_number (INTEGER)   -- 1, 2, 3, ... (toujours numéroté)
date (DATE)
title (VARCHAR)        -- "Jour 1", "Jour 2", etc.
notes (TEXT)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

**itinerary_activities**
```sql
id (UUID)
itinerary_day_id (UUID) -- FK to itinerary_days
place_id (UUID)        -- Reference to catalog.places (logical)
activity_order (INTEGER)  -- Ordre du jour
start_time (TIME)
end_time (TIME)
notes (TEXT)
is_completed (BOOLEAN)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

---

### `recommendation` — Recommendation Service

Logs des recommandations pour analytics et expérience personnalisée.

#### Tables

**recommendation_logs**
```sql
id (UUID)
user_id (UUID)         -- Reference to auth.users (logical)
place_id (UUID)        -- Reference to catalog.places (logical)
recommendation_type (VARCHAR)  -- 'contextual', 'category_based', 'proximity', 'trending'
score (DECIMAL)        -- 0-100 : pertinence
shown_at (TIMESTAMP)
clicked (BOOLEAN)
clicked_at (TIMESTAMP)
```

---

### `analytics` — Analytics Service

Logs d'événements et métriques agrégées pour l'admin.

#### Tables

**usage_events**
```sql
id (UUID)
user_id (UUID)         -- Reference to auth.users (nullable for anonymous)
event_type (VARCHAR)   -- 'place_view', 'itinerary_created', 'badge_earned', etc.
event_data (JSONB)     -- Contexte supplémentaire
user_agent (TEXT)
ip_address (INET)
created_at (TIMESTAMP)
```

**daily_metrics**
```sql
id (UUID)
date (DATE)
total_visitors (INTEGER)
new_users (INTEGER)
places_published (INTEGER)
proposals_received (INTEGER)
itineraries_created (INTEGER)
average_session_duration_seconds (INTEGER)
created_at (TIMESTAMP)
```

---

### `groups` — Group Service (Phase 4)

Sorties de groupe, membres, votes collectifs.

#### Tables

**groups**
```sql
id (UUID)
created_by_user_id (UUID)  -- Reference to auth.users (logical)
name (VARCHAR)
description (TEXT)
invitation_code (VARCHAR)  -- Unique code (ex: ABC123XYZ)
is_active (BOOLEAN)
created_at (TIMESTAMP)
expires_at (TIMESTAMP)
```

**group_members**
```sql
id (UUID)
group_id (UUID)        -- FK to groups
user_id (UUID)         -- Reference to auth.users (logical)
joined_at (TIMESTAMP)
```

**group_votes**
```sql
id (UUID)
group_id (UUID)        -- FK to groups
user_id (UUID)         -- Reference to auth.users (logical)
place_id (UUID)        -- Reference to catalog.places (logical)
voted_at (TIMESTAMP)
```

---

## Indexing Strategy

### Indices créés par défaut

```sql
-- auth
CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_user_preferences_user_id ON auth.user_preferences(user_id);
CREATE INDEX idx_visited_places_user_id ON auth.visited_places(user_id);
CREATE INDEX idx_user_achievements_user_id ON auth.user_achievements(user_id);

-- catalog
CREATE INDEX idx_places_category_id ON catalog.places(category_id);
CREATE INDEX idx_places_slug ON catalog.places(slug);
CREATE INDEX idx_place_tags_place_id ON catalog.place_tags(place_id);
CREATE INDEX idx_place_tags_tag_id ON catalog.place_tags(tag_id);
CREATE INDEX idx_events_place_id ON catalog.events(place_id);
CREATE INDEX idx_proposals_status ON catalog.place_proposals(status);
CREATE INDEX idx_stories_place_id ON catalog.place_stories(place_id);
CREATE INDEX idx_stories_status ON catalog.place_stories(status);

-- itinerary
CREATE INDEX idx_itineraries_user_id ON itinerary.itineraries(user_id);
CREATE INDEX idx_itinerary_days_itinerary_id ON itinerary.itinerary_days(itinerary_id);
CREATE INDEX idx_itinerary_activities_day_id ON itinerary.itinerary_activities(itinerary_day_id);

-- recommendation
CREATE INDEX idx_recommendation_logs_user_id ON recommendation.recommendation_logs(user_id);
CREATE INDEX idx_recommendation_logs_created ON recommendation.recommendation_logs(shown_at);

-- analytics
CREATE INDEX idx_usage_events_user_id ON analytics.usage_events(user_id);
CREATE INDEX idx_usage_events_type ON analytics.usage_events(event_type);
CREATE INDEX idx_usage_events_created ON analytics.usage_events(created_at);
CREATE INDEX idx_daily_metrics_date ON analytics.daily_metrics(date);

-- groups
CREATE INDEX idx_groups_created_by ON groups.groups(created_by_user_id);
CREATE INDEX idx_group_members_group_id ON groups.group_members(group_id);
CREATE INDEX idx_group_votes_group_id ON groups.group_votes(group_id);
```

---

## Key Constraints & Uniqueness

- `users.email` — UNIQUE
- `categories.slug` — UNIQUE
- `tags.slug` — UNIQUE
- `places.slug` — UNIQUE
- `place_tags(place_id, tag_id)` — UNIQUE (no duplicate associations)
- `visited_places(user_id, place_id)` — UNIQUE
- `favorites(user_id, place_id)` — UNIQUE
- `user_missions(user_id, mission_id)` — UNIQUE
- `group_members(group_id, user_id)` — UNIQUE
- `group_votes(group_id, user_id, place_id)` — UNIQUE
- `groups.invitation_code` — UNIQUE

---

## Logical References (No SQL Foreign Keys Between Schemas)

Pour respecter l'indépendance des microservices, les références suivantes sont **logiques** (UUID seulement) et vérifiées au niveau applicatif :

| From | To | Field | Verified |
|------|----|----|----------|
| `catalog.place_proposals.user_id` | `auth.users.id` | Call auth-service /profile |
| `catalog.place_stories.user_id` | `auth.users.id` | Call auth-service /profile |
| `catalog.place_stories.reviewed_by` | `auth.users.id` | Call auth-service /profile |
| `itinerary.itineraries.user_id` | `auth.users.id` | JWT token |
| `itinerary.itinerary_activities.place_id` | `catalog.places.id` | Call catalog-service /places/:id |
| `recommendation.recommendation_logs.user_id` | `auth.users.id` | JWT token |
| `recommendation.recommendation_logs.place_id` | `catalog.places.id` | Call catalog-service /places/:id |
| `analytics.usage_events.user_id` | `auth.users.id` | Optional, from JWT |
| `groups.groups.created_by_user_id` | `auth.users.id` | JWT token |
| `groups.group_members.user_id` | `auth.users.id` | JWT token |
| `groups.group_votes.user_id` | `auth.users.id` | JWT token |
| `groups.group_votes.place_id` | `catalog.places.id` | Call catalog-service /places/:id |

Cette approche permet à chaque service de :
- Être migrés indépendamment
- Avoir sa propre base de données à l'avenir
- Rester responsable de ses données sans dépendre d'autres services au niveau BD

---

## Migration & Tooling

### Créer la base de données

```bash
docker-compose exec postgres psql -U globetrotter_user -d globetrotter -f /docker-entrypoint-initdb.d/init.sql
```

Ou, automatiquement au premier `up` :

```bash
docker-compose up --build
```

### Reset complet (WARNING: PERTE DE DONNÉES)

```bash
docker-compose down -v
docker-compose up --build
```

### Ajouter une colonne

```bash
docker-compose exec postgres psql -U globetrotter_user -d globetrotter -c \
  "ALTER TABLE catalog.places ADD COLUMN new_column TEXT;"
```

### Dump & Restore

```bash
# Backup
docker-compose exec postgres pg_dump -U globetrotter_user globetrotter > backup.sql

# Restore
docker-compose exec postgres psql -U globetrotter_user globetrotter < backup.sql
```

---

## Design Rationale

### Un seul conteneur PostgreSQL

Pour le MVP, maintenir une instance PostgreSQL unique plutôt que d'en créer une par service. Raisons :
- Simplifier déploiement initial
- Schémas isolés fournissent isolation logique
- Séparation facile plus tard si nécessaire (pas de clés étrangères entre schémas)

### Pas de clés étrangères entre schémas

Chaque microservice reste autonome et déployable indépendamment.

### UUIDs partout

Identifiants décentralisés, pas de dépendances à des séquences globales.

### JSONB pour event_data

Flexibilité pour logger des structures d'événement variées sans créer nouvelles colonnes.

### Arrays (TEXT[]) pour tags et images

Pour l'instant, simple. Si besoin d'indexation avancée, normaliser en tables séparées.

---

## Monitoring & Performance

À implémenter Phase 2+ :

- Query performance logging (slow queries)
- Table statistics (`ANALYZE`, `VACUUM`)
- Index usage monitoring
- Partitioning par date (ex: `usage_events` par mois) si volume explose
- Connection pooling (via `pgbouncer`)

---

Voir `init.sql` pour DDL complet et exact.
