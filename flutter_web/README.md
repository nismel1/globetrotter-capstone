# Globetrotter — Flutter Web

Application web de découverte de destinations de voyage au Gabon, connectée au backend Flask existant.

## 🚀 Démarrage rapide

### Prérequis

- Flutter SDK (≥ 3.10.1)
- Backend Flask en cours d'exécution sur `http://localhost:5000`

### Développement

```bash
cd flutter_web
flutter pub get
flutter run -d chrome
```

L'application se lance sur `http://localhost:8080` et communique avec l'API Flask sur `http://localhost:5000`.

### Production

```bash
cd flutter_web
flutter build web
```

Le build est généré dans `flutter_web/build/web/`. Le serveur Flask (`app/__init__.py`) détecte automatiquement
la présence de ce répertoire et sert l'application Flutter buildée à la racine `/`.

## 📁 Structure du projet

```
flutter_web/
├── lib/
│   ├── main.dart                 # Point d'entrée, thème, providers, routage
│   ├── config/
│   │   ├── app_config.dart       # Configuration API
│   │   └── theme.dart            # Design system Gabon (couleurs, typographie, espacement)
│   ├── models/
│   │   ├── destination.dart      # Modèle Destination
│   │   ├── itinerary.dart        # Modèle Itinéraire
│   │   ├── proposal.dart         # Modèle Proposition + SystemStats
│   │   ├── review.dart           # Modèle Avis + FavoriteNote
│   │   └── user.dart             # Modèle Utilisateur
│   ├── providers/
│   │   ├── auth_provider.dart    # State management authentification
│   │   └── app_provider.dart     # State management global (destinations, itinéraires, etc.)
│   ├── services/
│   │   └── api_service.dart      # Client API complet avec JWT
│   ├── screens/
│   │   ├── login_screen.dart     # Connexion / Inscription
│   │   ├── home_screen.dart      # Accueil (hero, recherche, catégories, populaires)
│   │   ├── explorer_screen.dart  # Explorer (carte provinces, destinations)
│   │   ├── destination_detail_screen.dart  # Détail destination
│   │   ├── favorites_screen.dart # Favoris & Visités + notes personnelles
│   │   ├── itineraries_screen.dart  # Itinéraires / Roadmap (CRUD)
│   │   ├── recommendations_screen.dart  # Recommandations personnalisées
│   │   ├── events_screen.dart    # Événements culturels
│   │   ├── proposals_screen.dart # Propositions de destinations
│   │   ├── admin_screen.dart     # Admin (stats, modération, utilisateurs)
│   │   ├── profile_screen.dart   # Profil (préférences, déconnexion)
│   │   └── navigation_screen.dart  # Navigation simulée
│   ├── navigation/
│   │   └── app_navigator.dart    # Shell responsive (bottom nav / sidebar)
│   └── widgets/
│       ├── common.dart           # Widgets communs (shimmer, empty state, patterns)
│       ├── destination_card.dart  # Carte destination réutilisable
│       └── gabonese_pattern.dart  # Motifs décoratifs gabonais
├── test/
│   └── widget_test.dart          # Tests de base
├── web/
│   ├── index.html                # Point d'entrée HTML
│   ├── manifest.json             # PWA manifest
│   └── icons/                    # Icônes PWA
├── assets/                       # Images et ressources locales
├── pubspec.yaml                  # Dépendances
└── README.md
```

## 🎨 Design System

Le design system Gabon (`config/theme.dart`) reprend la palette de couleurs et la typographie
de l'application mobile React Native, avec des adaptations pour le web.

### Couleurs principales

- `vertGabon` (#009639) — Primaire
- `jauneGabon` (#FCD116) — Accent
- `bleuGabon` (#3A75C4) — Accent secondaire
- `ivoire` (#FFF8E7) — Fond
- `vertForet` (#064D2C) — Fond foncé

### Typographie

- **Poppins** (700-800) — Titres
- **Inter** (400-600) — Corps de texte

## 🔌 API

Le service API (`services/api_service.dart`) expose toutes les méthodes nécessaires :

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `login` | POST /login | Authentification |
| `register` | POST /register + /login | Inscription + JWT |
| `getDestinations` | GET /destinations | Liste/filtres destinations |
| `getRecommendations` | GET /recommendations | Recommandations personnalisées |
| `getItineraries` | GET /itineraries | Itinéraires utilisateur |
| `createItinerary` | POST /itineraries | Créer itinéraire |
| `updateItinerary` | PUT /itineraries/:id | Modifier itinéraire |
| `deleteItinerary` | DELETE /itineraries/:id | Supprimer itinéraire |
| `getReviews` | GET /reviews | Avis destinations |
| `createReview` | POST /reviews | Publier avis |
| `getVisited` | GET /visited | Destinations visitées |
| `markVisited` | POST /visited | Marquer visitée |
| `getFavoriteNotes` | GET /favorite-notes | Notes personnelles |
| `saveFavoriteNote` | POST /favorite-notes | Sauvegarder note |
| `getMyProposals` | GET /proposals | Mes propositions |
| `submitProposal` | POST /proposals | Soumettre proposition |
| `getAdminStats` | GET /admin/stats | Stats admin |
| `getAdminProposals` | GET /admin/proposals | Modérer propositions |
| `approveProposal` | POST /admin/proposals/:id/approve | Approuver |
| `rejectProposal` | POST /admin/proposals/:id/reject | Rejeter |
| `updateProfile` | PUT /profile | Modifier profil |

## 📱 Responsive

L'application utilise un shell responsive :
- **Mobile** (< 600px) : Bottom navigation bar
- **Desktop** (≥ 600px) : Sidebar latérale + AppBar

## 🧪 Tests

```bash
cd flutter_web
flutter test
```

## 🏗️ Build production

```bash
cd flutter_web
flutter build web
python ../app/main.py  # Flask sert le build Flutter
```

## 📄 Licence

MIT - Globetrotter © 2024
