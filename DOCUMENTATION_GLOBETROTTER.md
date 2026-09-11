# 📘 Globetrotter LBV — Document de Synthèse Complète de l'Application

**Globetrotter LBV** est une plateforme web intelligente et immersive dédiée à la découverte, la planification et l'exploration touristique et culturelle de **Libreville et du Gabon**.

---

## 🏛️ Vue d'Ensemble & Mission

L'application combine **microservices backend**, **cartographie Leaflet/OSRM**, **assistant virtuel IA**, **données météo en direct**, **ludification par missions (Gamification)**, et **outils collaboratifs premium pour groupes**.

---

## 🔌 1. État des Connexions API & Cartographie

### 🗺️ Carte Interactive de l'Onglet Itinéraire
- **Composant Cartographique** : Intégration de `RouteMap.jsx` utilisant la bibliothèque **Leaflet.js** et le moteur de routage **OSRM (Open Source Routing Machine)** via le proxy backend.
- **Routage Dynamique** : Calcule la distance totale (en km) et la durée estimée (en h/min) selon 3 modes de transport (**Voiture 🚗**, **À pied 🚶**, **Vélo 🚲**) et 2 modes d'itinéraire (**Ordre séquentiel →** ou **Ordre optimisé ✦**).
- **Geocoding & GPS automatique** : Chaque activité ajoutée (depuis le catalogue, l'assistant IA ou la saisie manuelle) est automatiquement géolocalisée grâce à un système intelligent de correspondance GPS sur Libreville (Pointe Denis, Cathédrale Sainte-Marie, Quartier Louis, Sablière, Raponda-Walker, etc.).
- **Affichage Auto** : La carte s'affiche automatiquement dès que 2 activités ou plus sont présentes dans la journée.

### 🌤️ API Météo en Direct (Open-Meteo API)
- **Connexion Live** : Connexion directe à l'API Open-Meteo (`https://api.open-meteo.com/v1/forecast`) avec les coordonnées de Libreville (`latitude: 0.3924`, `longitude: 9.4536`).
- **Métriques Réelles** : Température réelle (°C), ressenti, taux d'humidité (%), vitesse du vent (km/h), précipitations (mm), et icônes WMO dynamiques (Ciel dégagé, Partiellement nuageux, Bruine, Orage).
- **Mode Résilient / Fallback** : En cas de coupure réseau, basculement transparent vers les données climatiques équatoriales habituelles de Libreville (29°C), garantissant qu'aucune partie météo n'est jamais figée ou en erreur.

### 🤖 API Chatbot Assistant IA
- **Assistant Embarqué** : Intégré directement dans la page Itinéraire ([InlineItineraryChatbot.jsx](file:///c:/Users/GSI/3D%20Objects/Globetrotter-LBV/frontend/src/components/InlineItineraryChatbot.jsx)) et en fenêtre flottante sur l'application.
- **Génération & Ajout Automatique** : Répond aux questions sur Libreville, propose des circuits sur mesure (*Plage & Détente, Culture & Histoire, Gastronomie Gabonaise, Nature & Ecotourisme*) et permet d'ajouter n'importe quelle suggestion directement à l'itinéraire actif du jour.

---

## 🌟 2. Synthèse Complète des Fonctionnalités par Module

### 📅 A. Module Itinéraire Personnalisé (`/itinerary`)
1. **Gestion Chronologique par Jour** : Création, modification et suppression d'activités avec heure, durée et notes.
2. **Assistant IA Conversations** : Chatbot interactif remplaçant l'ancien quiz pour vous recommander et créer des activités sur mesure.
3. **Météo & Suggestions Contextuelles** : Bandeau d'analyse en direct combinant météo et heure de la journée (*ex: activités d'intérieur proposées s'il pleut*).
4. **Calculateur de Budget Dynamique** : Estimation automatique des coûts (Hébergement, Activités, Transports, Repas) avec jauges visuelles.
5. **Carte de Routage OSRM** : Visualisation du tracé Leaflet entre les étapes avec calcul de trajet.
6. **Exportation Multi-formats** : Téléchargement au format **JSON**, **Fichier Calendrier (.ics)** pour Google/Apple Calendar, et **Version Imprimable**.
7. **Carte Visuelle Partageable** : Modal de génération de carte postale graphique personnalisée téléchargeable en PNG HD et partageable par lien/réseaux sociaux.

### 🎯 B. Phase 2 (Engagement) — Défis Libreville & Notifications (`/defis`)
1. **Missions par Catégorie** :
   - 🏛️ *Patrimoine & Histoire* (ex: Visite de la Cathédrale Sainte-Marie, Musée National).
   - 🍲 *Gastronomie Gabonaise* (ex: Déguster le Poulet Nyembwe à Louis, Poisson braisé à Okala).
   - 🌿 *Nature & Aventure* (ex: Traversée vers la Pointe Denis, Forêt de Raponda-Walker).
   - 📸 *Photo & Spots Secrets* (ex: Selfie devant le monument du Bord de Mer).
   - 🎨 *Artisanat & Culture* (ex: Masques sacrés de la vallée de l'Ogooué).
2. **Gamification & Niveau Voyageur** : Validation interactive des missions avec gain de points d'expérience (**XP**), jauges de progression de niveau et déblocage de badges (*Gourmet Gaboma, Navigateur de l'Estuaire, Historien LBV*).
3. **Système de Notifications In-App** : Cloche dans la barre de navigation avec badge non-lus, tiroir latéral déroulant et alertes toasting instantanées lors de l'accomplissement des défis ou des mises à jour météo.

### 🏛️ C. Phase 3 (Intelligence) — Patrimoine & Voix Locales (`/patrimoine`)
1. **Curseur Avant / Après Patrimoine** : Glissière comparative interactive permettant de comparer les photos d'archives historiques (1950-1975) et actuelles (2026) des monuments de Libreville (*Cathédrale Sainte-Marie, Boulevard Triomphal, Le Bord de Mer*).
2. **Contributions & Bons Plans d'Habitants** : Espace *"Bons Plans Gaboma"* où les locaux partagent leurs conseils secrets (meilleurs horaires de régate de pirogues, choix du poisson braisé, astuces de guides) avec système de votes communautaires.
3. **Formulaire de Soumission Locale** : Possibilité pour les habitants de publier leurs propres recommandations.

### 👥 D. Phase 4 (Premium) — Sorties & Dashboard Groupe (`/groupes`)
1. **Création & Gestion de Sorties de Groupe** : Organisation d'excursions (Pirogue Pointe Denis, Tournée des Maquis, Réserve Akanda) avec date, nombre max de participants et lien d'invitation.
2. **Votes Collectifs** : Système de votes interactif (👍 *J'aime*, 👎 *Pas fan*, ⭐ *Coup de cœur*) pour établir le consensus sur les activités du groupe.
3. **Calculateur de Répartition des Dépenses (Budget Splitter)** : Calcul automatique de la part individuelle selon les frais engagés par chaque participant (*pirogue, hébergement, repas*).
4. **Dashboard de Groupe** : Suivi des confirmations de présence et gestion collective des tâches.

### 🔍 E. Explorer & Catalogues (`/explorer` & `/events`)
1. **Fiches Destinations Riches** : Photos, descriptions, meilleure saison, météo dédiée du lieu et carte interactive Leaflet.
2. **Événements & Festival** : Agenda culturel, concerts et fêtes locales à Libreville.
3. **Audio Ambiance** : Lecteur audio d'ambiance gabonaise intégré avec bouton on/off dans la barre de navigation.

---

## 🏗️ 3. Architecture Technique

- **Frontend** : React 18, Vite 5, React Router 6, Leaflet.js, i18next, Heroicons.
- **Styling** : Design System Vanilla CSS responsive avec tokens globals (Palette Sombre/Or `#D4AF37`, Vert Savane `#679436`, Bleu Lagune `#427AA1`).
- **Backend Microservices** : Node.js & Express (API Gateway, Auth, Catalog, Itinerary, Recommendation, Chatbot, Analytics).
- **Base de Données** : PostgreSQL avec 6 schémas dédiés.
