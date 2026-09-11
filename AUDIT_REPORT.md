# Audit de stabilisation - Globetrotter V2

**Date :** 2026-09-01  
**Phase :** 0 - Audit factuel  
**Périmètre :** frontend Vite/React, API Gateway, services Node.js, PostgreSQL, Docker Compose, Nginx, intégrations OpenRouter, Open-Meteo, OSRM et Elasticsearch.

## Synthèse

Globetrotter possède une base fonctionnelle réutilisable : authentification, catalogue, propositions de lieux, événements, audio, itinéraires, routage OSRM, météo, groupes et administration. Cependant, ce n'est pas encore une application déployable en production. Les défauts les plus importants concernent l'autorisation au sein des services, les secrets, les incohérences de schéma/contrat, l'absence de migrations et de tests, ainsi que plusieurs fonctionnalités représentées par une UI mais sans cycle de données complet.

Le frontend ne construit pas actuellement : [frontend/src/pages/LoginPage.jsx](frontend/src/pages/LoginPage.jsx) importe `../../styles/2.png`, fichier absent du dépôt.

## État des fonctionnalités

| Domaine | État | Constat |
| --- | --- | --- |
| Authentification | Partiel | Inscription et connexion passent par le gateway, mais JWT et secrets ne sont pas prêts pour la production. L'inscription n'est pas en trois étapes. |
| Catalogue et exploration | Partiel | Lieux, catégories, tags et événements existent ; validation, médias, prix, avis et import sont incomplets. |
| Propositions de lieux | Fonctionnel avec limite | Le client envoie maintenant `image_urls` et le catalogue les persiste. Les images restent encodées en base64 dans PostgreSQL, pas dans un stockage média. |
| Météo | Fonctionnel autonome | Open-Meteo et repli visuel existent. Les données ne guident pas encore systématiquement recommandations et itinéraires. |
| Audio | Fonctionnel avec limite | Le lecteur global charge désormais le catalogue audio actif et journalise les écoutes. Pas de choix explicite de piste côté utilisateur. |
| Itinéraires et OSRM | Partiel | Édition et calcul OSRM existent. Le budget fictif a été retiré ; les prix réels par lieu ne sont pas encore modélisés. |
| Partage d'itinéraires | Partiel | Un jeton public persistant et une page publique ont été ajoutés. L'ownership doit être contrôlé avant la création du jeton. |
| Chatbot | Partiel | OpenRouter est configuré à l'exécution ; conversations en mémoire et réponses sans contexte contrôlé du catalogue. |
| Recommandations | Partiel | Service présent, mais pas de moteur explicable combinant préférences, météo, prix, distance et historique. |
| Groupes | Partiel | Service et tables existent, mais contrôles d'appartenance insuffisants. |
| Social, avis, messages, notifications | Manquant ou incomplet | Pas de message-service, notification-service, fil social, likes/commentaires ni temps réel. |
| Missions et badges | Partiel | Tables et gestion admin existent ; les déclencheurs automatiques et le lien missions-badges manquent. |
| Administration | Partiel | CRUD ajouté pour lieux, événements, catégories, tags, missions, badges et stories. Prix, médias, imports, avis, sources et rôle super-admin ne sont pas complets. |

## État des services

| Service | État | Observations |
| --- | --- | --- |
| API Gateway | Partiel | JWT, CORS, Helmet, HPP et rate limiting existent. Il doit transmettre une identité vérifiable ou les services doivent vérifier le JWT. |
| Auth service | Partiel | Hash de mots de passe et endpoints profil existent ; ressources utilisateur accessibles sans contrôle systématique d'ownership au service. |
| Catalog service | Partiel | CRUD, propositions, stories, missions et audio existent. Les routes `/admin` reposent aujourd'hui sur le gateway, sans défense interne. |
| Itinerary service | Partiel | Création, jours et activités existent mais les divergences de noms de colonnes et l'ownership sont à corriger. |
| Recommendation service | Partiel | Service minimal ; intégration de l'ensemble des signaux produit non démontrée. |
| Analytics service | Partiel | Journalisation présente, mais observabilité, agrégation et couverture d'événements insuffisantes. |
| Group service | Partiel | Persistance de groupe/votes/dépenses, mais authentification et permissions insuffisantes. |
| Chatbot service | Partiel | Clé OpenRouter désormais injectée au runtime, mais conversations non persistées et endpoints sans protection suffisante. |
| Message service | Manquant | Requis par le produit cible. |
| Notification service | Manquant | Requis par le produit cible. |

## Registre des problèmes

| ID | Gravité | Composant | Cause | Impact | Dépendances | Correction recommandée | Tests nécessaires | Statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Critique | Services métier | Les services auth, catalogue, itinéraire et groupes ne vérifient pas uniformément le JWT et l'ownership. | Lecture/modification de ressources d'autrui si le réseau interne est atteint ou si le gateway est contourné. | JWT commun, contrats interservices | Middleware JWT partagé, vérification `req.user.id`, rôle super-admin, identité transmise et validée. | API : 401 sans token, 403 accès croisé, admin autorisé. | Ouvert |
| SEC-002 | Critique | docker-compose | `POSTGRES_PASSWORD` et `JWT_SECRET` sont codés en dur. | Exposition des secrets et impossibilité de gérer les environnements proprement. | `.env`, secret manager | Remplacer chaque secret par variable obligatoire ; ajouter `.env.example`; rotation immédiate des secrets déjà exposés. | `docker compose config`, scan secrets. | Ouvert |
| SEC-003 | Haute | Elasticsearch | `xpack.security.enabled=false`. | Index modifiable par tout service connecté au réseau interne. | Configuration prod Elastic | Activer X-Pack en staging/prod et injecter les identifiants via secrets. | Test sans/avec credentials. | Ouvert |
| SEC-004 | Haute | Chatbot | Conversations dans un `Map`, aucune isolation utilisateur et prompts non fondés sur le catalogue. | Perte au redémarrage, fuite potentielle de contexte, hallucinations. | PostgreSQL, auth, catalogue | Tables dédiées, ownership, retrieval contrôlé, politique d'actions côté serveur. | Persistance, isolation A/B, indisponibilité OpenRouter. | Ouvert |
| DB-001 | Haute | PostgreSQL | `init.sql` unique et absence de migrations versionnées. | Changements non appliqués aux bases existantes et rollback impossible. | Outil migration | Introduire migrations idempotentes, baseline et pipeline de migration. | Base vierge, upgrade, rollback. | Ouvert |
| DB-002 | Haute | Itinéraires | Le SQL initial utilise `name`, `itinerary_day_id`, `start_time`, alors que le service utilise aussi `title`, `day_id`, `time`, et même une table de repli. | Création/lecture d'itinéraires instable selon la base initialisée. | Migration de schéma, service itinerary | Choisir un contrat unique et migrer service, gateway, schéma et frontend ensemble. | Création, lecture, édition, suppression sur base neuve. | Ouvert |
| API-001 | Haute | Itinerary service | `user_id` est accepté du body et accès aux itinéraires sans ownership interne. | Usurpation/création pour autrui. | SEC-001 | Ne jamais accepter l'identité client ; envoyer un contexte signé au service ou vérifier le JWT. | Tests accès propriétaire/non-propriétaire. | Ouvert |
| API-002 | Moyenne | Validation | Validation d'entrées incomplète et hétérogène hors gateway. | Données invalides et erreurs 500. | Schémas de validation | Schémas Zod/Joi au bord de chaque service ; limites/normalisation pour payloads. | Tests paramètres invalides et limites. | Ouvert |
| FE-001 | Critique | Frontend build | Import `../../styles/2.png` absent dans LoginPage. | `npm run build` échoue. | Asset ou suppression de l'import | Corriger le chemin ou fournir l'asset réel. | Build Vite. | Ouvert |
| FE-002 | Moyenne | Frontend | Styles inline très nombreux, gestion d'erreurs hétérogène et appels locaux directs. | Maintenance, i18n, responsive et cohérence UX difficiles. | Design system CSS, client API | Extraire progressivement des pages prioritaires; client HTTP centralisé; états loading/error/empty/retry. | Tests composants et captures multi-viewports. | Ouvert |
| FE-003 | Moyenne | Itinéraires | Budget réel indisponible faute de prix structurés. | Le produit ne répond pas au besoin budget. | Modèle prix, admin | Ajouter prix intervalle/devise/source/date de vérification aux lieux et calcul transparent. | Calcul de fourchettes et données manquantes. | Ouvert |
| FE-004 | Moyenne | Propositions | Images `data:` stockées dans une colonne PostgreSQL. | Payloads lourds, base gonflée, pas de scan/optimisation/provenance. | Stockage objet, antivirus, CDN | Upload multipart contrôlé vers stockage objet, métadonnées média en base. | MIME, taille, contenu, accès, suppression. | Ouvert |
| INT-001 | Moyenne | Météo/recommandation/itinéraire | Les informations météo ne sont pas consommées de façon démontrée par les décisions produit. | Recommandations et plans non contextuels. | Weather adapter, recommendation service | Définir un contrat météo cache et règles explicables. | Pluie/indisponibilité météo/alternatives. | Ouvert |
| INT-002 | Moyenne | Audio | Le lecteur prend la première piste catalogue et ne rafraîchit pas sa sélection après changement admin. | Gestion audio limitée. | Catalogue audio | Ajouter sélection utilisateur et invalidation/rafraîchissement. | Piste active, suppression pendant lecture, métriques. | Ouvert |
| INF-001 | Haute | Docker | Les services sont désormais internes via `expose`, mais PostgreSQL/Elastic restent configurés pour le développement et les services attendent parfois seulement `depends_on`. | Démarrage non déterministe et posture production incomplète. | Healthchecks, env, images | Profils dev/prod, secrets, healthchecks/readiness et `depends_on: condition: service_healthy`. | Démarrage sans DB/Elastic/OSRM. | Ouvert |
| INF-002 | Moyenne | Images Docker | Images et versions critiques ne sont pas toutes figées ; absence de politique de mise à jour/scans. | Risque chaîne d'approvisionnement. | CI | Pin des images, `npm ci`, scan Trivy/npm audit. | Build reproductible et scan CI. | Ouvert |
| OBS-001 | Haute | Observabilité | Absence de correlation ID, logs structurés, readiness et traçabilité répartie. | Diagnostic difficile en cas d'incident distribué. | Logger partagé, gateway | Middleware de correlation ID, logs JSON, `/ready`, métriques. | Test propagation ID et pannes dépendances. | Ouvert |
| QA-001 | Critique | Tests | Pas de suite unitaires, API, intégration ou E2E active. | Régressions non détectées ; aucune preuve des parcours critiques. | Framework tests, Docker test | Vitest/RTL frontend, Jest/Supertest backend, Playwright E2E, base éphémère. | 11 parcours E2E demandés et tests résilience. | Ouvert |
| PROD-001 | Haute | Nginx et routage | Nginx est globalement cohérent, mais HSTS/CSP production et stratégie TLS ne sont pas formalisés. | Posture web production insuffisante. | Domaine, TLS | Config production séparée avec TLS, HSTS conditionnel, CSP auditée et timeouts. | Headers de sécurité, SPA/API, charge. | Ouvert |
| PROD-002 | Haute | Services manquants | Aucun message-service ni notification-service avec persistance/retry/DLQ. | Les parcours sociaux et temps réel ne peuvent pas être terminés. | RabbitMQ, Redis, schémas | Concevoir contrats événementiels, puis ajouter uniquement ces deux services. | Message A/B, idempotence, retry, DLQ. | Ouvert |

## Points confirmés et non confirmés

- Confirmé : le gateway expose bien `/api/auth/signup`, donc ce chemin frontend n'est pas une incohérence à corriger.
- Confirmé : [frontend/src/pages/AdminPage.jsx](frontend/src/pages/AdminPage.jsx) bloque déjà les non-admins via `user?.role !== 'admin'`.
- Confirmé : la clé OpenRouter est maintenant fournie au chatbot à l'exécution par `env_file`, et ne doit plus être copiée dans l'image.
- Non confirmé : les services fonctionnent ensemble de bout en bout. Le build frontend est bloqué, et aucun test d'intégration automatisé n'existe.

## Plan de remédiation proposé

1. **Phase 1 - Contrats et sécurité** : résoudre `FE-001`, retirer les secrets codés en dur, introduire les migrations, stabiliser le schéma itinéraire, puis mettre en place JWT/ownership dans tous les services.
2. **Phase 2 - Infrastructure** : séparer Compose développement/production, ajouter readiness, healthchecks de dépendance, images figées, Elasticsearch sécurisé, stratégie secrets et logs corrélés.
3. **Phase 3 - Parcours de base** : authentification trois étapes, catalogue/médias/prix, explorer, itinéraire manuel persistant et calcul budgétaire sur prix vérifiés.
4. **Phase 4 - Intelligence** : contrat météo, recommandations explicables, chatbot RAG fondé sur données validées et actions autorisées serveur.
5. **Phase 5 - Social et asynchrone** : message-service, notification-service, RabbitMQ, fil social, modération et events idempotents.
6. **Phase 6 - Qualité et livraison** : suites unitaires/API/intégration/E2E, pannes simulées, tests responsive, documentation opérationnelle et audit final.

## Validation effectuée pendant l'audit

- Diagnostics VS Code sans erreur pour les fichiers modifiés durant la session.
- `node --check` réussi pour les services catalogue, itinéraire et gateway avec le binaire Node explicite.
- `docker compose config --quiet` réussi ; avertissement non bloquant : la clé Compose `version` est obsolète.
- Build Vite exécuté : échec confirmé dû à l'asset introuvable de LoginPage, indépendant des changements audio/proposition/partage.

## Décision de phase

**Phase 0 terminée.** Aucune déclaration "production ready" n'est justifiée. La prochaine action doit être la Phase 1, en commençant par le build bloquant, les secrets et l'autorisation/ownership, accompagnés de tests automatisés minimaux.
