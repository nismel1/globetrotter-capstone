# Globetrotter — Guide de démarrage rapide

Bienvenue ! Ce guide vous permet de démarrer l'application Globetrotter en moins de 5 minutes.

---

## 📋 Prérequis

✓ Docker 20.10+ et Docker Compose 2.0+
✓ Un terminal (Bash/PowerShell/CMD)
✓ ~2GB d'espace disque

**Installation** :
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (macOS / Windows)
- [Docker + Docker Compose](https://docs.docker.com/engine/install/) (Linux)

Vérifier l'installation :
```bash
docker --version
docker-compose --version
```

---

## 🚀 Démarrage en 3 étapes

### 1. Construire les images Docker

```bash
docker-compose build
```

Cela va télécharger et créer les images pour tous les services (environ 5-10 min la première fois).

### 2. Démarrer les services

```bash
docker-compose up -d
```

Attendez ~30 secondes le temps que tous les conteneurs démarrent.

### 3. Vérifier que tout fonctionne

```bash
docker-compose ps
```

Vous devriez voir tous les conteneurs en état **Up** :

```
NAME                             STATUS
globetrotter-postgres           Up
globetrotter-api-gateway        Up
globetrotter-auth-service       Up
globetrotter-catalog-service    Up
globetrotter-itinerary-service  Up
globetrotter-recommendation-service Up
globetrotter-analytics-service  Up
globetrotter-frontend           Up
```

---

## 🌐 Accéder à l'application

Ouvrez votre navigateur et allez à :

**http://localhost:3000**

### Pages de test

| Page | URL | Accès |
|------|-----|-------|
| Login | http://localhost:3000 | Public |
| Accueil | http://localhost:3000/home | Connecté |
| Explorer | http://localhost:3000/explorer | Connecté |
| Itinéraire | http://localhost:3000/itinerary | Connecté |
| Proposer | http://localhost:3000/propose | Connecté |
| Profil | http://localhost:3000/profile | Connecté |

### API Gateway (développeurs)

Health check : **http://localhost:4000/health**

---

## 👤 Créer un compte

1. Allez à http://localhost:3000
2. Cliquez sur **"Créer un compte"**
3. Remplissez le formulaire :
   - Email : votre@email.com
   - Mot de passe : qualunque
   - Nom : Votre Nom
4. Cliquez **Créer un compte**

Vous serez automatiquement connecté et redirigé vers l'accueil.

---

## 🔍 Explorer l'application

### Écran Accueil
- Liste les événements du jour
- Bouton "Commencer l'exploration" (ouvre le livre)

### Écran Explorer
- Grille de destinations
- Cliquez sur une destination pour voir ses détails

### Écran Itinéraire
- Créer itinéraire personnalisé
- Les itinéraires sont générés basés sur le quiz

### Écran Proposer
- Proposer un nouveau lieu
- Suivre le statut de vos propositions

### Écran Profil
- Voir votre passeport (lieux visités)
- Voir vos badges
- Accès aux paramètres

---

## 🗄️ Base de données

Pour accéder à PostgreSQL directement :

```bash
docker exec -it globetrotter-postgres psql -U postgres -d globetrotter
```

Commandes SQL utiles :

```sql
-- Voir tous les schémas
\dn

-- Voir les tables du schéma auth
\dt auth.*

-- Voir les utilisateurs
SELECT id, email, name FROM auth.users;

-- Voir les lieux
SELECT id, name, category_id FROM catalog.places LIMIT 10;

-- Voir les visiteurs
SELECT COUNT(DISTINCT user_id) FROM auth.visited_places;
```

---

## 📊 Logs & Débogage

### Voir tous les logs

```bash
docker-compose logs -f
```

### Logs d'un service spécifique

```bash
# API Gateway
docker-compose logs -f api-gateway

# Auth Service
docker-compose logs -f auth-service

# Base de données
docker-compose logs -f postgres
```

### Arrêter les logs

Appuyez sur **Ctrl+C**

---

## 🛑 Arrêter l'application

### Pause (services toujours disponibles)

```bash
docker-compose pause
```

### Redémarrer après pause

```bash
docker-compose unpause
```

### Arrêt complet

```bash
docker-compose stop
```

### Supprimer tous les conteneurs

```bash
docker-compose down
```

### Nettoyer complètement (⚠️ perte de données)

```bash
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Les services ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Vérifier que les ports ne sont pas utilisés
# Port 3000 (frontend), 4000 (API), 5432 (DB), 3001-3005 (services)
```

### Erreur "port already in use"

Changer les ports dans `docker-compose.yml` :

```yaml
ports:
  - "3001:80"  # Au lieu de 3000:80
```

### Erreur de connexion à la base de données

```bash
# Redémarrer le conteneur Postgres
docker-compose restart postgres

# Ou réinitialiser complètement
docker-compose down -v
docker-compose up -d
```

### L'application se charge lentement

- Vérifier les ressources Docker (settings)
- Vérifier les logs pour les erreurs API
- Augmenter le timeout réseau

---

## 📝 Données de test

Le système est préchargé avec :

**Catégories** (5)
- Loisirs & Front de Mer
- Patrimoine & Quartiers
- Nature & Biodiversité
- Gastronomie & Marchés
- Culture & Arts

**Chapitres du livre** (4)
- Une baie, une ville
- Les quartiers du cœur
- Aujourd'hui à Libreville
- Votre aventure Libreville

Pour ajouter des lieux :

```sql
INSERT INTO catalog.places (
  id, name, slug, category_id, description, 
  address, latitude, longitude, rating, status, created_at
) VALUES (
  gen_random_uuid(), 
  'Baie des Rois',
  'baie-des-rois',
  (SELECT id FROM catalog.categories LIMIT 1),
  'Vaste espace aménagé sur le front de mer',
  'Boulevard de la Mer',
  0.4161, 9.4432,
  4.5,
  'published',
  NOW()
);
```

---

## 📚 Documentation complète

- `README.md` — Aperçu du projet
- `docs/API.md` — Spécification REST complète
- `docs/DATABASE.md` — Modèle de données
- `docs/DEPLOYMENT.md` — Docker & production
- `docs/DESIGN.md` — Direction artistique
- `docs/ARCHITECTURE.md` — (À venir)

---

## 🎯 Prochaines étapes

### Phase 2 (Engagement)
- [ ] Défis Libreville (missions par catégorie)
- [ ] Cartes visuelles partageables
- [ ] Système de notifications

### Phase 3 (Intelligence)
- [ ] Suggestions contextuelles (météo, heure, distance)
- [ ] Contributions d'habitants
- [ ] Curseur Avant/Après patrimoine

### Phase 4 (Premium)
- [ ] Sorties de groupe
- [ ] Votes collectifs
- [ ] Dashboard groupe

---

## 💬 Besoin d'aide ?

1. **Docs de service** : Vérifier les commentaires dans `backend/*/src/index.js`
2. **Logs** : `docker-compose logs` sera votre meilleur ami
3. **Database** : Utiliser `psql` pour vérifier les données
4. **Frontend** : Ouvrir la console navigateur (F12)

---

## ✅ Checklist de démarrage

- [ ] Docker installé et testé
- [ ] `docker-compose build` complété
- [ ] `docker-compose up -d` lancé
- [ ] Tous les conteneurs en `Up`
- [ ] http://localhost:3000 accessible
- [ ] Compte créé avec succès
- [ ] Page d'accueil se charge
- [ ] Logs consultables

---

## 🎉 Bienvenue à Globetrotter !

L'application est prête pour le développement et les tests. Bonne exploration ! 🗺️
