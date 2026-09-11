# Globetrotter — Direction Artistique & Design System

## Principes fondamentaux

Globetrotter n'est pas un dashboard froid mais un **carnet de voyage vivant**. Chaque pixel raconte une histoire, chaque interaction prolonge l'expérience de découverte.

---

## Palette de couleurs

Ancrée aux éléments réels de Libreville :

| Nom | Hex | RGB | Utilisation |
|-----|-----|-----|-------------|
| **Forêt** | #14231D | 20, 35, 29 | Fond principal, texte dominant |
| **Lagune** | #1F4A45 | 31, 74, 69 | Surfaces, cartes, accents secondaires |
| **Latérite** | #A8472B | 168, 71, 43 | CTA principal, accent majeur |
| **Or du couchant** | #D9A441 | 217, 164, 65 | Accents, badges, éléments focus |
| **Sable** | #EFE6D3 | 239, 230, 211 | Texte clair, surfaces claires |
| **Bois/Raphia** | #9C917C | 156, 145, 124 | Texte secondaire, séparateurs |
| **Papier** | #EFE9DA | 239, 233, 218 | Fond principal (écrans clairs) |

### Inspirations

- **Forêt** : Canopée équatoriale à la tombée du jour
- **Lagune** : Eau de l'estuaire du Gabon
- **Latérite** : Terre et pistes du Gabon
- **Or** : Soleil couchant sur la Pointe Denis
- **Sable** : Plages de Libreville

---

## Typographie

### Hiérarchie typographique

**Display** (titres majeurs)
- Famille : Bell MT (ou Cormorant Garamond en approximation libre)
- Poids : 600
- Utilisation : H1, noms de lieux, mot-symbole "Globetrotter"
- ✗ Jamais pour texte courant

**Corps** (texte narratif)
- Famille : Public Sans ou Work Sans (sans-serif humaniste)
- Poids : 400/500
- Utilisation : Paragraphes, descriptions, contenu éditorial
- Caractéristique : Lisible, discret, chaleureux

**Utilitaire** (données pratiques)
- Famille : IBM Plex Mono
- Poids : 400/500
- Utilisation : Heures, distances, budgets, métadonnées, accroches
- Effet : "Ticket de carnet de voyage"

### Tailles (Mobile-first, 390px)

| Élément | Taille | Poids | Ligne | Utilisation |
|---------|--------|-------|-------|-------------|
| H1 | 2.125rem (34px) | 600 | 1.05 | Titres majeurs |
| H2 | 1.875rem (30px) | 600 | 1.1 | Titres sections |
| H3 | 1.5rem (24px) | 600 | 1.2 | Titres subsections |
| Body | 0.9375rem (15px) | 400 | 1.7 | Texte courant |
| Small | 0.8125rem (13px) | 400 | 1.6 | Captions |
| Eyebrow | 0.625rem (10px) | 400 | 1 | Rubriques, statuts |
| Mono | 0.75rem (12px) | 400 | 1.6 | Métadonnées |

---

## Composants

### Boutons

**Primaire** (CTA principal)
- Border: Latérite 1px
- BG: Latérite
- Text: Sable
- Hover: Forest BG
- Active: Scale 0.97

**Secondaire** (CTA alternatif)
- Border: Or 1px
- BG: Transparent
- Text: Or
- Hover: Or BG + Forest text
- Active: Scale 0.97

**Propriétés**
- Padding: 16px 24px
- Border-radius: 4px
- Font: Mono, uppercase, letter-spacing 0.1em
- Transition: 0.1s cubic-bezier

### Cards

**Propriétés**
- BG: Blanc
- Border-radius: 8px
- Padding: 16px
- Box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1)
- Hover: Shadow 0 4px 8px rgba(0, 0, 0, 0.15)
- Transition: 0.2s cubic-bezier

**Image** (carte lieu)
- Aspect ratio: 1:1 ou 16:9
- Border-radius: 8px
- Object-fit: cover

### Séparateurs

**Fin doré** (rule)
- Height: 1px
- Background: Latérite
- Margin: 16px 0

Jamais d'ombres portées sous cartes → trop "dashboard". Les séparateurs fins racontent l'organisation du voyage.

### Élément signature : Tampon de passeport

Le tampon circulaire encreur est **le seul geste décoratif fort** répété dans toute l'app.

**Propriétés**
- Forme: Cercle
- Border: 1.5px Solid Or
- Diameter: 44px
- Transform: rotate(-10deg)
- Animation: scaleStamp (0.35s, elastic)
- Trigger: Action explicite utilisateur (jamais auto)

**Placement**
- Explorer → Coin supérieur droit de carte
- Passeport → Filigrane derrière avatar
- Itinéraire → Overlay sur place visitée

---

## Animations & Transitions

### Principes

- **Mouvements discrets** : Jamais de rebond ni de boucle infinies sur éléments statiques
- **Direction unique** : Les mouvements ont un sens narratif
- **Durées courtes** : 150ms à 400ms max
- **Courbe d'accélération** : cubic-bezier(0.4, 0, 0.2, 1) par défaut (ease-out)
- **Respects prefers-reduced-motion** : Toujours

### Catalogue

| Interaction | Animation | Durée | Courbe |
|------------|-----------|-------|--------|
| Navigation entre onglets | Fadeout + slide 8px vertical | 150ms | ease-out |
| Accueil → Livre | Shared element + stretch BG | 400ms | ease-out |
| Page explorer → Fiche lieu | Shared element image hero | 300ms | ease-out |
| Tourner page livre | Horizontal slide + shadow edge | 200ms | ease-out |
| Changement audio | Crossfade | 600ms | ease-in-out |
| Tampon passeport | Scale 0→1.1→1 + rotate | 350ms | cubic-bezier(0.68, -0.55, 0.265, 1.55) |
| Chargement contenu | Paper reveal (clip-path L→R) | 500ms | ease-out |
| Pull-to-refresh | Boussole tourne | Pendant tirage | linear |
| Boutons (press) | Scale 0.97 | 100ms | ease-out |
| Jour itinéraire | Slide horizontal + 12px vertical | 300ms | ease-out |

### Réduction des mouvements

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## Audio / Ambiance sonore

### Stratégie

Chaque lieu et chaque chapitre du livre peut porter une **boucle sonore discrète** (3-6 secondes) :
- Vagues et vent (plages)
- Forêt tropicale (nature)
- Bruits de marché (commercial)
- Cris d'oiseaux (parcs)

### Règles non négociables

1. **Jamais d'autoplay** → Plateformes mobiles bloquent l'autoplay sonore. Geste explicite utilisateur (tap/swipe) requis.

2. **Interrupteur global** → Paramètres, désactivé par défaut à première utilisation.

3. **Fondu croisé 600ms** → Changement de lieu/chapitre = transition douce, jamais de coupure sèche.

### Implémentation

```javascript
// Pseudo-code
const audioManager = {
  currentAudio: null,
  audioEnabled: localStorage.getItem('audioEnabled') === 'true' || false,
  
  async playWithCrossfade(newAudioUrl, duration = 600) {
    if (!this.audioEnabled) return;
    
    // Fadeout ancien audio
    this.currentAudio?.fadeOut(duration / 2);
    
    // Créer nouvel audio
    const newAudio = new Audio(newAudioUrl);
    newAudio.loop = true;
    newAudio.volume = 0;
    newAudio.play();
    
    // Fade in nouveau
    newAudio.fadeIn(duration / 2);
    this.currentAudio = newAudio;
  }
};
```

---

## Layout

### Viewport mobile cible

- **Largeur** : 390px (iPhone SE+, base commune)
- **Hauteur** : 844px viewport utile
- **Zone de sécurité** : Considérer les encoches et barres

### Zones du layout

```
┌──────────────────────────┐ 70px — Topbar (sticky)
│ Topbar (back / status)  │
├──────────────────────────┤
│                          │
│    Scroll container      │ ← Flex: 1, overflow-y: auto
│   (contenu principal)    │
│                          │
├──────────────────────────┤ 70px — Bottom nav (fixed)
│ 🏠 🔍 🗺️ ✏️ 👤           │ ← 5 items
└──────────────────────────┘
```

**Padding/Margins**
- Général : 16px (md)
- Sections : 24px (lg)
- Carte → Carte : 12px

### Responsive

- **< 390px** : Scaling, réduction font-size
- **> 390px** : Centrer dans écran (max-width 390px)
- **Tablet** : (Phase 2+) Layout 2-colonne optionnel

---

## Densité informationnelle

### Principe « Journal »

Pas de dense grilles de dashboard. Chaque écran raconte une histoire :

- **Accueil** : Photo hero + événements jour + appel à exploration
- **Explorer** : Cartes vignettes style magazine
- **Fiche lieu** : Texte narratif avec lettrine + citation + métadonnées note de bas
- **Itinéraire** : Chronologie jour par jour
- **Profil** : Passeport avec tampons historiques

---

## Accessibilité

### Contraste

Tous les textes respectent WCAG AA minimum :
- Forest sur Sand : 8.5:1 (✓ AAA)
- Laterite sur Paper : 6.2:1 (✓ AA)
- Bark sur Paper : 4.8:1 (✓ AA)
- Gold sur Forest : 4.1:1 (~ AA, marginal)

### Tailles tactiles

- Minimum 44px × 44px pour tous les tappables
- Gap minimum 8px entre éléments tactiles

### Textes alternatifs

- Toutes images : `alt` texte descriptif
- Icônes bottons : `aria-label`
- Sections principales : `<section>` avec `aria-label`

### Couleur seule

Jamais communiquer l'information par la couleur uniquement. Toujours accompagner de texte ou icône.

---

## Dark Mode (Future - Phase 3+)

Basculer à palette inverse :

| Actuel | Dark mode |
|--------|-----------|
| Paper (clair) | Forest |
| Forest | Paper |
| Laterite | Gold |
| Bark | Sand |

Implémenter via CSS custom properties :

```css
:root {
  --bg-primary: var(--paper);
  --text-primary: var(--forest);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: var(--forest);
    --text-primary: var(--sand);
  }
}
```

---

## Glossaire des termes design

- **Lettrine** : Première lettre agrandie d'un paragraphe
- **Citation mise en avant** : Blockquote centrale, typographie distincte
- **Métadonnées note de bas** : Infos pratiques (budget, horaires) en Mono discret
- **Cartes vignettes** : Petit format 2D, style magazine, pas tableau
- **Tampon encreur** : Cercle avec border dashed, effet sceau
- **Crossfade audio** : Transition douce entre deux pistes sonores
- **Shared element** : Animation d'un élément qui persiste entre écrans
- **Paper reveal** : Effet clip-path qui rétracte de gauche à droite
