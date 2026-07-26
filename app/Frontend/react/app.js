const { createElement: h, Fragment, useEffect, useMemo, useState } = React;
const { createRoot } = ReactDOM;

const ASSET_BASE = "/assets/";
const LOGO = `${ASSET_BASE}logo.png`;

function getImageUrl(img, index = 0) {
  if (!img) return `${ASSET_BASE}g1.jpg`;
  if (typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))) {
    return img;
  }
  const fallbackNum = ((index || 0) % 14) + 1;
  return `${ASSET_BASE}g${fallbackNum}.jpg`;
}

function handleImageError(e, index = 0) {
  e.target.onerror = null;
  const fallbackNum = ((index || 0) % 14) + 1;
  e.target.src = `${ASSET_BASE}g${fallbackNum}.jpg`;
}

function getDisplayName(dest, lang) {
  if (!dest) return "";
  if (lang === "en") return dest.name_en || dest.name || dest.name_fr;
  return dest.name_fr || dest.name || dest.name_en;
}

function getDisplayDesc(dest, lang) {
  if (!dest) return "";
  if (lang === "en") return dest.description_en || dest.description || dest.description_fr;
  return dest.description_fr || dest.description || dest.description_en;
}

const icons = {
  search: "M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z",
  map: "M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z M9 3v15 M15 6v15",
  heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z",
  user: "M20 21a8 8 0 0 0-16 0 M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z",
  calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
  star: "m12 2 3.09 6.26L22 9.27l-5 4.88 1.18 6.88L12 17.77l-6.18 3.26L7 14.15 2 9.27l6.91-1.01L12 2Z",
  route: "M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M8.5 14.5l7-6",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M16 8l-2.4 5.6L8 16l2.4-5.6L16 8Z",
  hotel: "M3 21h18 M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16 M9 8h.01 M15 8h.01 M9 12h.01 M15 12h.01 M10 21v-5h4v5",
  fork: "M6 2v8 M10 2v8 M6 6h4 M8 10v12 M17 2v20 M14 7c0-2.76 1.34-5 3-5",
  activity: "M22 12h-4l-3 8-6-16-3 8H2",
  close: "M18 6 6 18 M6 6l12 12",
  refresh: "M21 12a9 9 0 0 1-15.39 6.36L3 16 M3 21v-5h5 M3 12A9 9 0 0 1 18.39 5.64L21 8 M21 3v5h-5",
  plus: "M12 5v14 M5 12h14",
  note: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  check: "M20 6 9 17l-5-5",
  mapPin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  arrowRight: "M5 12h14 M12 5l7 7-7 7",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"
};

const CAMEROON_REGIONS = [
  "Région du Centre (Yaoundé)",
  "Région du Littoral (Douala)",
  "Région de l'Ouest (Bafoussam)",
  "Région du Nord-Ouest (Bamenda)",
  "Région du Sud (Kribi)",
  "Région du Sud-Ouest (Buea/Limbé)",
  "Région de l'Extrême-Nord (Maroua)",
  "Région du Nord (Garoua)",
  "Région de l'Adamaoua (Ngaoundéré)",
  "Région de l'Est (Bertoua)"
];

const AVATARS = [
  `${ASSET_BASE}logo.png`,
  `${ASSET_BASE}g1.jpg`,
  `${ASSET_BASE}g2.jpg`,
  `${ASSET_BASE}g3.jpg`,
  `${ASSET_BASE}g4.jpg`,
  `${ASSET_BASE}g5.jpg`
];

const translations = {
  fr: {
    home: "Accueil",
    explorer: "Explorer",
    itinerary: "Voyages",
    favorites: "Favoris",
    profile: "Profil",
    admin: "Admin",
    propose: "Proposer",
    search_placeholder: "Rechercher un lieu au Cameroun...",
    connect: "Se connecter",
    logout: "Se déconnecter",
    cancel: "Annuler",
    confirm: "Confirmer",
    delete: "Supprimer",
    edit: "Modifier",
    save: "Sauvegarder",
    loading: "Chargement...",
    propose_title: "Proposer un lieu au Cameroun",
    propose_subtitle: "Partagez vos meilleures adresses locales",
    region: "Région du Cameroun",
    city: "Ville / Localité",
    cost: "Coût estimé / jour (EUR)",
    desc: "Description",
    tags: "Mots-clés (séparés par virgule)",
    submit: "Envoyer la proposition",
    welcome_title: "Globetrotter Cameroun",
    welcome_sub: "Explorez le Cameroun & ses merveilles",
    must_see: "Incontournables au Cameroun",
    must_see_sub: "Sélection de lieux d'exception",
    explore_title: "Explorer le Cameroun",
    all_categories: "Toutes les catégories",
    food_bar: "Gastronomie & Bar",
    nature_parks: "Nature & Parcs",
    culture_heritage: "Culture & Patrimoine",
    shopping_markets: "Shopping & Marchés",
    reset_filters: "Réinitialiser les filtres",
    trips_title: "Vos Voyages & Itinéraires",
    trips_sub: "Planifiez vos circuits d'exception au Cameroun",
    create_trip: "+ Créer un voyage",
    trip_title_label: "Titre du voyage",
    trip_cities_label: "Villes principales",
    no_trips: "Aucun voyage planifié pour le moment",
    first_trip_btn: "Créer votre premier voyage",
    favorites_title: "Vos Coups de Cœur",
    favorites_sub: "Lieux sauvegardés",
    no_favorites: "Aucun favori enregistré",
    fav_hint: "Parcourez les lieux et cliquez sur ❤️ pour les ajouter ici",
    login_title: "Connexion Globetrotter",
    login_sub: "Accédez à votre espace voyageur au Cameroun",
    register_title: "Créer un compte",
    register_sub: "Rejoignez la communauté des voyageurs",
    username_label: "Nom d'utilisateur / Email",
    password_label: "Mot de passe",
    prefs_label: "Vos centres d'intérêt",
    account_settings: "Paramètres du compte",
    edit_profile: "Modifier mes informations & Avatar",
    logout_confirm_title: "Déconnexion",
    logout_confirm_msg: "Êtes-vous sûr de vouloir vous déconnecter ?",
    admin_title: "🛡️ Panneau d'Administration (Temps Réel)",
    admin_sub: "Gestion globale de l'application Globetrotter",
    admin_stats_users: "Utilisateurs",
    admin_stats_places: "Lieux au Cameroun",
    admin_stats_pending: "En attente",
    admin_pending_proposals: "Propositions en attente (Temps Réel)",
    admin_add_place: "Ajouter directement un lieu au Cameroun",
    approve: "Approuver",
    reject: "Rejeter"
  },
  en: {
    home: "Home",
    explorer: "Explore",
    itinerary: "Trips",
    favorites: "Favorites",
    profile: "Profile",
    admin: "Admin",
    propose: "Propose",
    search_placeholder: "Search places in Cameroon...",
    connect: "Log in",
    logout: "Log out",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    loading: "Loading...",
    propose_title: "Propose a place in Cameroon",
    propose_subtitle: "Share your best local spots",
    region: "Cameroon Region",
    city: "City / Town",
    cost: "Est. cost / day (EUR)",
    desc: "Description",
    tags: "Tags (comma separated)",
    submit: "Submit Proposal",
    welcome_title: "Globetrotter Cameroon",
    welcome_sub: "Explore Cameroon & its wonders",
    must_see: "Must-See Places in Cameroon",
    must_see_sub: "Handpicked exceptional places",
    explore_title: "Explore Cameroon",
    all_categories: "All categories",
    food_bar: "Food & Bar",
    nature_parks: "Nature & Parks",
    culture_heritage: "Culture & Heritage",
    shopping_markets: "Shopping & Markets",
    reset_filters: "Reset filters",
    trips_title: "Your Trips & Itineraries",
    trips_sub: "Plan your amazing circuits in Cameroon",
    create_trip: "+ Create a trip",
    trip_title_label: "Trip title",
    trip_cities_label: "Main cities",
    no_trips: "No trips planned yet",
    first_trip_btn: "Create your first trip",
    favorites_title: "Your Favorites",
    favorites_sub: "Saved places",
    no_favorites: "No favorites saved",
    fav_hint: "Browse places and click ❤️ to add them here",
    login_title: "Globetrotter Login",
    login_sub: "Access your traveler space in Cameroon",
    register_title: "Create an Account",
    register_sub: "Join the travel community",
    username_label: "Username / Email",
    password_label: "Password",
    prefs_label: "Interests & Preferences",
    account_settings: "Account Settings",
    edit_profile: "Edit Profile & Avatar",
    logout_confirm_title: "Log out",
    logout_confirm_msg: "Are you sure you want to log out?",
    admin_title: "🛡️ Admin Dashboard (Real-time)",
    admin_sub: "Global management of Globetrotter app",
    admin_stats_users: "Users",
    admin_stats_places: "Cameroon Places",
    admin_stats_pending: "Pending",
    admin_pending_proposals: "Pending Proposals (Real-time)",
    admin_add_place: "Add a Cameroon Place Directly",
    approve: "Approve",
    reject: "Reject"
  }
};

function Icon({ name, size = 20 }) {
  return h("svg", {
    className: "icon",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  }, h("path", { d: icons[name] || icons.compass }));
}

function money(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value || 35);
}

// Robust API Helper catching non-JSON responses cleanly
async function api(path, options = {}, token = "") {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  
  try {
    const response = await fetch(path, { ...options, headers });
    const contentType = response.headers.get("content-type") || "";
    let payload = {};
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      const text = await response.text();
      throw new Error(`Erreur serveur (${response.status})`);
    }
    
    if (!response.ok) {
      throw new Error(payload.error || `Erreur (${response.status})`);
    }
    return payload;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Skeleton Components
function SkeletonCard() {
  return h("div", { className: "skeleton-card" },
    h("div", { className: "skeleton skeleton--image" }),
    h("div", { className: "skeleton-card__body" },
      h("div", { className: "skeleton skeleton--text" }),
      h("div", { className: "skeleton skeleton--text skeleton--short" }),
      h("div", { className: "skeleton skeleton--text skeleton--shorter" })
    )
  );
}

function SkeletonGrid({ count = 6 }) {
  return h("div", { className: "destination-grid" },
    Array.from({ length: count }).map((_, i) => h(SkeletonCard, { key: i }))
  );
}

// Geometric Background Shapes Component
function GeometricShapes() {
  return h("div", { className: "bg-shapes" },
    h("div", { className: "shape-blob shape-blob--1" }),
    h("div", { className: "shape-blob shape-blob--2" }),
    h("div", { className: "shape-blob shape-blob--3" }),
    h("div", { className: "shape-geom-circle shape-geom-circle--1" }),
    h("div", { className: "shape-geom-circle shape-geom-circle--2" }),
    h("div", { className: "shape-geom-poly" })
  );
}

// Navigation Header
function TopHeader({ onPropose, session, lang, setLang, current, setCurrent }) {
  const t = translations[lang] || translations.fr;
  return h("header", { className: "top-header" },
    h("button", { 
      className: "brand-small", 
      type: "button",
      onClick: () => setCurrent("home")
    },
      h("img", { src: LOGO, alt: "Globetrotter", style: { width: "32px", height: "32px" } }),
      h("span", null, "Globetrotter")
    ),

    h("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
      h("div", { className: "language-selector" },
        h(Icon, { name: "globe", size: 16 }),
        h("select", {
          value: lang,
          onChange: (e) => setLang(e.target.value),
          "aria-label": "Langue"
        },
          h("option", { value: "fr" }, "FR"),
          h("option", { value: "en" }, "EN")
        )
      ),
      session.token && h("button", { 
        className: "button-icon-text", 
        type: "button",
        onClick: onPropose
      }, 
        h(Icon, { name: "plus", size: 18 }),
        h("span", null, t.propose)
      )
    )
  );
}

// Bottom Navigation
function BottomNav({ current, setCurrent, session, lang }) {
  const t = translations[lang] || translations.fr;
  const nav = [
    ["home", t.home, "compass"],
    ["explorer", t.explorer, "map"],
    ["itinerary", t.itinerary, "route"],
    ["favorites", t.favorites, "heart"],
    ["profile", t.profile, "user"],
  ];

  if (session.username === "admin") {
    nav.push(["admin", t.admin, "shield"]);
  }

  return h("nav", { className: "bottom-nav-mobile", "aria-label": "Navigation mobile" },
    nav.map(([key, label, iconName]) => h("button", {
      key,
      type: "button",
      className: current === key ? "bottom-nav-item is-active" : "bottom-nav-item",
      onClick: () => setCurrent(key),
      "aria-label": label,
    }, 
      h(Icon, { name: iconName, size: 22 }),
      h("span", null, label)
    ))
  );
}

// Hero Section
function Hero({ setCurrent, setFilters, session, lang }) {
  const t = translations[lang] || translations.fr;
  const [search, setSearch] = useState("");

  function submit(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: search }));
    setCurrent("explorer");
  }

  return h("section", { className: "hero-new" },
    h(GeometricShapes),
    h("div", { className: "hero-new__bg" },
      h("img", { src: `${ASSET_BASE}g11.jpg`, alt: "Cameroun", onError: (e) => handleImageError(e, 11) })
    ),
    h("div", { className: "hero-new__content" },
      h("img", { className: "hero-new__logo", src: LOGO, alt: "Logo Globetrotter", style: { width: "64px", height: "64px" } }),
      h("h1", null, t.welcome_title),
      h("p", { className: "hero-new__subtitle" }, t.welcome_sub),
      h("form", { className: "search-bar-new", onSubmit: submit },
        h(Icon, { name: "search", size: 20 }),
        h("input", {
          value: search,
          onChange: (event) => setSearch(event.target.value),
          placeholder: t.search_placeholder,
          "aria-label": "Recherche",
        }),
        h("button", { className: "search-button", type: "submit" }, 
          h(Icon, { name: "arrowRight", size: 20 })
        )
      )
    )
  );
}

// Destination Card Component with Dynamic Translation of pois.json
function DestinationCard({ destination, index = 0, favorites, toggleFavorite, openDetail, session, onLoginClick, lang }) {
  const key = destination.id || destination.name;
  const isFavorite = favorites.includes(key) || favorites.includes(destination.name);
  const displayName = getDisplayName(destination, lang);
  
  function handleFavoriteClick(e) {
    e.stopPropagation();
    if (!session.token) {
      onLoginClick();
      return;
    }
    toggleFavorite(key);
  }
  
  return h("article", { 
    className: "destination-card-new",
    onClick: () => openDetail(destination)
  },
    h("div", { className: "destination-card-new__bg" },
      h("img", { 
        src: getImageUrl(destination.image, index), 
        alt: displayName, 
        loading: "lazy",
        onError: (e) => handleImageError(e, index)
      })
    ),
    h("div", { className: "destination-card-new__overlay" }),
    h("button", { 
      className: isFavorite ? "favorite-btn is-active" : "favorite-btn", 
      type: "button", 
      onClick: handleFavoriteClick,
      "aria-label": "Ajouter aux favoris" 
    }, h(Icon, { name: "heart", size: 18 })),
    h("div", { className: "destination-card-new__content" },
      h("div", { className: "destination-card-new__top" },
        h("h3", null, displayName),
        h("p", { className: "destination-card-new__country" }, destination.city || destination.country)
      ),
      h("div", { className: "destination-card-new__bottom" },
        h("div", { className: "destination-card-new__tags" },
          (destination.tags || []).slice(0, 2).map((tag) => h("span", { key: tag, className: "tag" }, tag))
        ),
        h("span", { className: "destination-card-new__price" }, money(destination.avg_cost_per_day))
      )
    )
  );
}

// Home View
function Home({ destinations, favorites, toggleFavorite, openDetail, setCurrent, setFilters, session, onLoginClick, loading, lang }) {
  const t = translations[lang] || translations.fr;
  return h(Fragment, null,
    h(Hero, { setCurrent, setFilters, session, lang }),
    h("section", { className: "section-new", style: { position: "relative" } },
      h(GeometricShapes),
      h("div", { className: "section-new__header" },
        h("h2", null, t.must_see),
        h("p", null, t.must_see_sub)
      ),
      loading 
        ? h(SkeletonGrid, { count: 6 })
        : h("div", { className: "destination-grid" },
            destinations.slice(0, 8).map((destination, idx) => h(DestinationCard, {
              destination,
              index: idx,
              favorites,
              toggleFavorite,
              openDetail,
              key: destination.id || destination.name,
              session,
              onLoginClick,
              lang
            }))
          )
    )
  );
}

// Explorer View with Translated POIs
function Explorer({ destinations, filters, setFilters, favorites, toggleFavorite, openDetail, session, onLoginClick, loading, lang }) {
  const t = translations[lang] || translations.fr;

  const filtered = useMemo(() => {
    return destinations.filter((dest) => {
      const displayName = getDisplayName(dest, lang);
      const displayDesc = getDisplayDesc(dest, lang);
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const searchable = `${displayName} ${dest.country} ${dest.city || ''} ${displayDesc}`.toLowerCase();
        if (!searchable.includes(query)) return false;
      }
      if (filters.tag && !dest.tags.map(t => t.toLowerCase()).includes(filters.tag.toLowerCase())) {
        return false;
      }
      if (filters.max_cost && dest.avg_cost_per_day > Number(filters.max_cost)) {
        return false;
      }
      return true;
    });
  }, [destinations, filters, lang]);

  return h("section", { className: "section-new", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "section-new__header" },
      h("h2", null, t.explore_title),
      h("p", null, `${filtered.length} lieu${filtered.length > 1 ? 'x' : ''}`)
    ),

    h("div", { className: "filter-bar" },
      h("input", {
        type: "text",
        placeholder: t.search_placeholder,
        value: filters.q,
        onChange: (e) => setFilters(f => ({ ...f, q: e.target.value })),
        className: "filter-input"
      }),
      h("select", {
        value: filters.tag,
        onChange: (e) => setFilters(f => ({ ...f, tag: e.target.value })),
        className: "filter-select"
      },
        h("option", { value: "" }, t.all_categories),
        h("option", { value: "food" }, t.food_bar),
        h("option", { value: "nature" }, t.nature_parks),
        h("option", { value: "culture" }, t.culture_heritage),
        h("option", { value: "shopping" }, t.shopping_markets)
      )
    ),

    loading
      ? h(SkeletonGrid, { count: 8 })
      : filtered.length > 0
        ? h("div", { className: "destination-grid" },
            filtered.slice(0, 36).map((destination, idx) => h(DestinationCard, {
              destination,
              index: idx,
              favorites,
              toggleFavorite,
              openDetail,
              key: destination.id || destination.name,
              session,
              onLoginClick,
              lang
            }))
          )
        : h("div", { className: "empty-state-simple" },
            h(Icon, { name: "search", size: 48 }),
            h("p", null, "Aucun lieu ne correspond à votre recherche"),
            h("button", { 
              className: "button-secondary", 
              onClick: () => setFilters({ q: "", tag: "", max_cost: "" }) 
            }, t.reset_filters)
          )
  );
}

// Compact & Visual Trips / Itineraries Page
function ItineraryPage({ session, onLoginClick, lang }) {
  const t = translations[lang] || translations.fr;
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [destName, setDestName] = useState("");

  useEffect(() => {
    if (session.token) {
      api("/itineraries", {}, session.token)
        .then(setItineraries)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session.token]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const created = await api("/itineraries", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          destinations: destName ? [destName.trim()] : ["Yaoundé", "Kribi"]
        })
      }, session.token);
      setItineraries([created, ...itineraries]);
      setTitle("");
      setDestName("");
      setShowCreate(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm(lang === 'en' ? "Delete this trip?" : "Voulez-vous vraiment supprimer cet itinéraire ?")) return;
    try {
      await api(`/itineraries/${id}`, { method: "DELETE" }, session.token);
      setItineraries(itineraries.filter(it => it.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (!session.token) {
    return h("section", { className: "section-new compact-header", style: { position: "relative" } },
      h(GeometricShapes),
      h("div", { className: "empty-state-simple" },
        h("img", { src: LOGO, alt: "Logo", style: { width: "40px", height: "40px", marginBottom: "12px" } }),
        h("h2", null, t.trips_title),
        h("p", null, t.trips_sub),
        h("button", { className: "button-primary", onClick: onLoginClick }, t.connect)
      )
    );
  }

  return h("section", { className: "section-new compact-header", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "section-new__header", style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      h("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
        h("img", { src: LOGO, alt: "Logo", style: { width: "36px", height: "36px", borderRadius: "50%" } }),
        h("div", null,
          h("h2", { style: { fontSize: "1.4rem" } }, t.trips_title),
          h("p", { style: { fontSize: "12px" } }, t.trips_sub)
        )
      ),
      h("button", { 
        className: "button-primary", 
        onClick: () => setShowCreate(true) 
      }, t.create_trip)
    ),

    showCreate && h("form", { className: "modal-form", onSubmit: handleCreate, style: { marginBottom: "20px" } },
      h("div", { className: "modal-form__body" },
        h("label", { className: "form-label" },
          h("span", null, t.trip_title_label),
          h("input", { value: title, onChange: e => setTitle(e.target.value), placeholder: "ex: Week-end à Kribi", required: true })
        ),
        h("label", { className: "form-label" },
          h("span", null, t.trip_cities_label),
          h("input", { value: destName, onChange: e => setDestName(e.target.value), placeholder: "ex: Kribi, Yaoundé" })
        ),
        h("div", { style: { display: "flex", gap: "10px" } },
          h("button", { className: "button-primary", type: "submit" }, t.save),
          h("button", { className: "button-secondary", type: "button", onClick: () => setShowCreate(false) }, t.cancel)
        )
      )
    ),

    loading
      ? h(SkeletonGrid, { count: 2 })
      : itineraries.length > 0
        ? h("div", { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            itineraries.map((it) => h("div", { key: it.id, className: "trip-card-visual" },
              h("div", { className: "trip-card-header" },
                h("h3", null, it.title),
                h("button", { className: "action-btn-danger", onClick: () => handleDelete(it.id) }, t.delete)
              ),
              h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" } },
                h(Icon, { name: "mapPin", size: 16 }),
                h("span", { className: "trip-card-tag" }, (it.destinations || []).join(", ") || "Cameroun")
              )
            ))
          )
        : h("div", { className: "empty-state-simple" },
            h(Icon, { name: "route", size: 48 }),
            h("p", null, t.no_trips),
            h("button", { className: "button-primary", onClick: () => setShowCreate(true) }, t.first_trip_btn)
          )
  );
}

// Favorites View (Deduplicated & Translated)
function Favorites({ destinations, favorites, toggleFavorite, openDetail, session, onLoginClick, loading, lang }) {
  const t = translations[lang] || translations.fr;

  const items = useMemo(() => {
    const seenNames = new Set();
    const result = [];
    for (const dest of destinations) {
      const key = dest.id || dest.name;
      if ((favorites.includes(key) || favorites.includes(dest.name)) && !seenNames.has(dest.name)) {
        seenNames.add(dest.name);
        result.push(dest);
      }
    }
    return result;
  }, [destinations, favorites]);

  if (!session.token) {
    return h("section", { className: "section-new", style: { position: "relative" } },
      h(GeometricShapes),
      h("div", { className: "empty-state-simple" },
        h(Icon, { name: "heart", size: 48 }),
        h("h2", null, t.favorites_title),
        h("p", null, t.fav_hint),
        h("button", { className: "button-primary", onClick: onLoginClick }, t.connect)
      )
    );
  }

  return h("section", { className: "section-new", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "section-new__header" },
      h("h2", null, t.favorites_title),
      h("p", null, `${items.length} lieu${items.length > 1 ? 'x' : ''}`)
    ),

    loading
      ? h(SkeletonGrid, { count: 4 })
      : items.length > 0
        ? h("div", { className: "destination-grid" },
            items.map((destination, idx) => h(DestinationCard, {
              destination,
              index: idx,
              favorites,
              toggleFavorite,
              openDetail,
              key: destination.id || destination.name,
              session,
              onLoginClick,
              lang
            }))
          )
        : h("div", { className: "empty-state-simple" },
            h(Icon, { name: "heart", size: 48 }),
            h("p", null, t.no_favorites),
            h("p", { className: "empty-state-hint" }, t.fav_hint)
          )
  );
}

// Reverted to Clean First Version of Login Page
function AuthPage({ mode, setMode, setSession, onSuccess, lang }) {
  const t = translations[lang] || translations.fr;
  const [form, setForm] = useState({ username: "", password: "", preferences: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        await api("/register", { 
          method: "POST", 
          body: JSON.stringify({ 
            username: form.username.trim(), 
            password: form.password,
            preferences: form.preferences.split(",").map(p => p.trim()).filter(Boolean)
          }) 
        });
        setMode("login");
        setError("✓ Compte créé ! Connectez-vous.");
        setLoading(false);
        return;
      }

      const payload = await api("/login", { 
        method: "POST", 
        body: JSON.stringify({ 
          username: form.username.trim(), 
          password: form.password 
        }) 
      });
      
      localStorage.setItem("globetrotterToken", payload.token);
      localStorage.setItem("globetrotterUser", form.username.trim());
      setSession({ token: payload.token, username: form.username.trim() });
      setLoading(false);
      onSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return h("section", { className: "auth-page", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "auth-page__content" },
      h("div", { className: "auth-card-new" },
        h("img", { src: LOGO, alt: "Logo", className: "auth-card-new__logo", style: { width: "64px", height: "64px" } }),
        h("h1", null, mode === "login" ? t.login_title : t.register_title),
        h("p", { className: "auth-card-new__subtitle" }, 
          mode === "login" ? t.login_sub : t.register_sub
        ),
        
        h("div", { className: "auth-tabs" },
          h("button", {
            className: mode === "login" ? "auth-tab is-active" : "auth-tab",
            type: "button",
            onClick: () => setMode("login")
          }, "Connexion"),
          h("button", {
            className: mode === "register" ? "auth-tab is-active" : "auth-tab",
            type: "button",
            onClick: () => setMode("register")
          }, "Inscription")
        ),
        
        h("form", { className: "auth-form", onSubmit: submit },
          h("label", { className: "form-label" },
            h("span", null, t.username_label),
            h("input", {
              name: "username",
              value: form.username,
              onChange: update,
              autoComplete: "username",
              required: true,
              placeholder: "ex: voyager_cm ou admin"
            })
          ),
          
          h("label", { className: "form-label" },
            h("span", null, t.password_label),
            h("input", {
              name: "password",
              type: "password",
              value: form.password,
              onChange: update,
              autoComplete: "current-password",
              required: true,
              placeholder: "••••••••"
            })
          ),
          
          mode === "register" && h("label", { className: "form-label" },
            h("span", null, t.prefs_label),
            h("input", {
              name: "preferences",
              value: form.preferences,
              onChange: update,
              placeholder: "gastronomie, nature, culture"
            })
          ),
          
          error && h("div", { className: "form-error" }, error),
          
          h("button", { 
            className: "button-primary button-full", 
            type: "submit",
            disabled: loading
          }, loading ? t.loading : (mode === "login" ? t.connect : t.register_title))
        )
      )
    )
  );
}

// Profile Page & Account Editor
function Profile({ session, setSession, favorites, destinations, onLoginClick, lang, setLang }) {
  const t = translations[lang] || translations.fr;
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [avatar, setAvatar] = useState(localStorage.getItem("globetrotterAvatar") || AVATARS[0]);
  const [newPassword, setNewPassword] = useState("");
  const [newPrefs, setNewPrefs] = useState("");

  const favoriteItems = useMemo(() => {
    const seenNames = new Set();
    const result = [];
    for (const dest of destinations) {
      const key = dest.id || dest.name;
      if ((favorites.includes(key) || favorites.includes(dest.name)) && !seenNames.has(dest.name)) {
        seenNames.add(dest.name);
        result.push(dest);
      }
    }
    return result;
  }, [destinations, favorites]);

  function handleLogout() {
    localStorage.removeItem("globetrotterToken");
    localStorage.removeItem("globetrotterUser");
    setSession({ token: "", username: "" });
    setShowLogoutConfirm(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    try {
      await api("/profile", {
        method: "PUT",
        body: JSON.stringify({
          avatar,
          preferences: newPrefs ? newPrefs.split(",").map(p => p.trim()) : undefined,
          password: newPassword || undefined
        })
      }, session.token);
      localStorage.setItem("globetrotterAvatar", avatar);
      setShowEditProfile(false);
      alert("Profil mis à jour avec succès !");
    } catch (err) {
      alert(err.message);
    }
  }

  if (!session.token) {
    return h("section", { className: "section-new profile-login", style: { position: "relative" } },
      h(GeometricShapes),
      h("div", { className: "profile-login__content" },
        h("img", { src: LOGO, alt: "Logo", className: "profile-login__logo" }),
        h("h2", null, t.profile),
        h("p", null, t.login_sub),
        h("button", { className: "button-primary", onClick: onLoginClick }, t.connect)
      )
    );
  }

  return h("section", { className: "section-new profile-page", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "profile-header" },
      h("div", { className: "profile-avatar" },
        h("img", { src: avatar, alt: session.username, onError: (e) => { e.target.src = LOGO; } })
      ),
      h("div", { className: "profile-info" },
        h("h2", null, session.username),
        h("p", null, session.username === "admin" ? "🛡️ Administrateur Globetrotter" : "🌍 Voyageur au Cameroun")
      )
    ),

    h("div", { className: "profile-stats" },
      h("div", { className: "stat-card" },
        h("div", { className: "stat-card__icon" }, h(Icon, { name: "heart", size: 20 })),
        h("div", { className: "stat-card__value" }, favoriteItems.length),
        h("div", { className: "stat-card__label" }, t.favorites)
      ),
      h("div", { className: "stat-card" },
        h("div", { className: "stat-card__icon" }, h(Icon, { name: "mapPin", size: 20 })),
        h("div", { className: "stat-card__value" }, "Cameroun"),
        h("div", { className: "stat-card__label" }, "Pays")
      )
    ),

    h("div", { className: "admin-card", style: { marginTop: "24px" } },
      h("h3", { style: { marginBottom: "16px" } }, t.account_settings),
      h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        h("button", { 
          className: "button-secondary", 
          onClick: () => setShowEditProfile(true) 
        }, h(Icon, { name: "edit", size: 16 }), ` ${t.edit_profile}`),

        h("button", { 
          className: "action-btn-danger", 
          style: { padding: "12px", fontSize: "14px" },
          onClick: () => setShowLogoutConfirm(true) 
        }, t.logout)
      )
    ),

    showEditProfile && h("div", { className: "modal-backdrop", onClick: () => setShowEditProfile(false) },
      h("form", { className: "modal-form", onSubmit: handleSaveProfile, onClick: e => e.stopPropagation() },
        h("div", { className: "modal-form__header" },
          h("h2", null, t.edit_profile)
        ),
        h("div", { className: "modal-form__body" },
          h("label", { className: "form-label" },
            h("span", null, "Choisissez un Avatar"),
            h("div", { style: { display: "flex", gap: "10px", marginTop: "8px" } },
              AVATARS.map((avUrl, i) => h("img", {
                key: i,
                src: avUrl,
                style: {
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  border: avatar === avUrl ? "3px solid var(--primary)" : "none"
                },
                onClick: () => setAvatar(avUrl)
              }))
            )
          ),
          h("label", { className: "form-label" },
            h("span", null, "Nouveau mot de passe (optionnel)"),
            h("input", { type: "password", value: newPassword, onChange: e => setNewPassword(e.target.value), placeholder: "••••••••" })
          ),
          h("label", { className: "form-label" },
            h("span", null, t.prefs_label),
            h("input", { value: newPrefs, onChange: e => setNewPrefs(e.target.value), placeholder: "nature, food, culture" })
          )
        ),
        h("div", { className: "modal-form__footer" },
          h("button", { className: "button-secondary", type: "button", onClick: () => setShowEditProfile(false) }, t.cancel),
          h("button", { className: "button-primary", type: "submit" }, t.save)
        )
      )
    ),

    showLogoutConfirm && h("div", { className: "modal-backdrop", onClick: () => setShowLogoutConfirm(false) },
      h("div", { className: "modal-form", onClick: e => e.stopPropagation(), style: { padding: "24px", textAlign: "center" } },
        h("h2", null, t.logout_confirm_title),
        h("p", { style: { margin: "16px 0" } }, t.logout_confirm_msg),
        h("div", { style: { display: "flex", gap: "12px", justifyContent: "center" } },
          h("button", { className: "button-secondary", onClick: () => setShowLogoutConfirm(false) }, t.cancel),
          h("button", { className: "action-btn-danger", style: { padding: "10px 20px" }, onClick: handleLogout }, t.logout)
        )
      )
    )
  );
}

// Proposal Modal Form (Cameroon Specs)
function ProposalForm({ session, onClose, lang }) {
  const t = translations[lang] || translations.fr;
  const [form, setForm] = useState({
    name: "",
    region: CAMEROON_REGIONS[0],
    city: "Yaoundé",
    description: "",
    tags: "",
    cost: "50"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await api("/proposals", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          country: "Cameroun",
          continent: "Afrique",
          city: form.city.trim(),
          description: `${form.region} - ${form.description.trim()}`,
          tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
          avg_cost_per_day: Number(form.cost) || 50
        }),
      }, session.token);
      
      setSuccess(true);
      setLoading(false);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return h("div", { className: "modal-backdrop", onClick: onClose },
    h("form", { className: "modal-form", onSubmit: submit, onClick: (e) => e.stopPropagation() },
      h("button", { className: "modal-close", type: "button", onClick: onClose }, 
        h(Icon, { name: "close" })
      ),
      
      h("div", { className: "modal-form__header" },
        h("img", { src: LOGO, alt: "Logo", className: "modal-form__logo", style: { width: "40px", height: "40px" } }),
        h("h2", null, t.propose_title),
        h("p", null, t.propose_subtitle)
      ),
      
      h("div", { className: "modal-form__body" },
        h("label", { className: "form-label" },
          h("span", null, "Nom du lieu / attraction"),
          h("input", { name: "name", value: form.name, onChange: update, required: true, placeholder: "ex: Chutes de Lobé, Rooftop Zèbre..." })
        ),
        
        h("div", { className: "form-row" },
          h("label", { className: "form-label" },
            h("span", null, t.region),
            h("select", { name: "region", value: form.region, onChange: update },
              CAMEROON_REGIONS.map(r => h("option", { key: r, value: r }, r))
            )
          ),
          h("label", { className: "form-label" },
            h("span", null, t.city),
            h("input", { name: "city", value: form.city, onChange: update, required: true, placeholder: "ex: Kribi, Douala..." })
          )
        ),
        
        h("label", { className: "form-label" },
          h("span", null, t.desc),
          h("textarea", { name: "description", value: form.description, onChange: update, required: true, rows: "3", placeholder: "Décrivez ce lieu au Cameroun..." })
        ),
        
        h("div", { className: "form-row" },
          h("label", { className: "form-label" },
            h("span", null, t.tags),
            h("input", { name: "tags", value: form.tags, onChange: update, placeholder: "nature, beach, food" })
          ),
          h("label", { className: "form-label" },
            h("span", null, t.cost),
            h("input", { name: "cost", type: "number", value: form.cost, onChange: update, placeholder: "50" })
          )
        ),
        
        error && h("div", { className: "form-error" }, error),
        success && h("div", { className: "form-success" }, "✓ Proposition envoyée à l'administrateur !")
      ),
      
      h("div", { className: "modal-form__footer" },
        h("button", { className: "button-secondary", type: "button", onClick: onClose }, t.cancel),
        h("button", { className: "button-primary", type: "submit", disabled: loading }, 
          loading ? t.loading : t.submit
        )
      )
    )
  );
}

// Detail Modal with Translated Title & Description
function DetailModal({ destination, onClose, lang }) {
  if (!destination) return null;
  const displayName = getDisplayName(destination, lang);
  const displayDesc = getDisplayDesc(destination, lang);
  
  return h("div", { className: "modal-backdrop", onClick: onClose },
    h("div", { className: "detail-modal-new", onClick: (e) => e.stopPropagation() },
      h("button", { className: "modal-close", onClick: onClose }, 
        h(Icon, { name: "close" })
      ),
      h("div", { className: "detail-modal-new__image" },
        h("img", { 
          src: getImageUrl(destination.image), 
          alt: displayName,
          onError: (e) => handleImageError(e, 1)
        })
      ),
      h("div", { className: "detail-modal-new__content" },
        h("div", { className: "detail-modal-new__header" },
          h("h2", null, displayName),
          h("p", null, 
            h(Icon, { name: "mapPin", size: 16 }),
            `${destination.city || destination.country}, Cameroun`
          )
        ),
        h("p", { className: "detail-modal-new__description" }, displayDesc),
        h("div", { className: "detail-modal-new__tags" },
          (destination.tags || []).map((tag) => 
            h("span", { className: "tag-badge", key: tag }, tag)
          )
        ),
        h("div", { className: "detail-modal-new__price" },
          h(Icon, { name: "star", size: 20 }),
          h("span", null, money(destination.avg_cost_per_day), " par jour")
        )
      )
    )
  );
}

// Admin Dashboard Screen with REAL-TIME Polling
function AdminDashboard({ session, lang }) {
  const t = translations[lang] || translations.fr;
  const [stats, setStats] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // New location form state
  const [newPlace, setNewPlace] = useState({
    name: "",
    city: "Yaoundé",
    description: "",
    tags: "culture, food",
    cost: "45"
  });

  const loadData = () => {
    Promise.all([
      api("/admin/stats", {}, session.token),
      api("/admin/proposals?status=pending", {}, session.token),
      api("/admin/users", {}, session.token)
    ]).then(([st, props, usrs]) => {
      setStats(st);
      setProposals(props);
      setUsers(usrs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  // Real-time polling every 3 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [session.token]);

  async function handleApprove(id) {
    try {
      await api(`/admin/proposals/${id}/approve`, { method: "POST" }, session.token);
      setProposals(proposals.filter(p => p.id !== id));
      loadData();
      alert("Proposition approuvée !");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await api(`/admin/proposals/${id}/reject`, { method: "POST" }, session.token);
      setProposals(proposals.filter(p => p.id !== id));
      loadData();
      alert("Proposition rejetée.");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleAddPlace(e) {
    e.preventDefault();
    if (!newPlace.name.trim()) return;
    try {
      await api("/admin/destinations", {
        method: "POST",
        body: JSON.stringify({
          name: newPlace.name.trim(),
          country: "Cameroun",
          continent: "Afrique",
          city: newPlace.city.trim(),
          description: newPlace.description.trim(),
          tags: newPlace.tags.split(",").map(t => t.trim()),
          avg_cost_per_day: Number(newPlace.cost) || 50
        })
      }, session.token);
      alert("Nouveau lieu ajouté au catalogue Globetrotter Cameroun !");
      setNewPlace({ name: "", city: "Yaoundé", description: "", tags: "culture, food", cost: "45" });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return h(SkeletonGrid, { count: 4 });

  return h("section", { className: "section-new admin-dashboard", style: { position: "relative" } },
    h(GeometricShapes),
    h("div", { className: "section-new__header", style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
      h("div", null,
        h("h2", null, t.admin_title),
        h("p", null, t.admin_sub)
      ),
      h("button", { className: "button-secondary", onClick: loadData, style: { fontSize: "12px" } }, "🔄 Rafraîchir")
    ),

    stats && h("div", { className: "admin-stats-grid" },
      h("div", { className: "admin-stat-card" },
        h("div", { className: "admin-stat-card__icon" }, h(Icon, { name: "user", size: 24 })),
        h("div", null,
          h("div", { className: "admin-stat-card__val" }, stats.total_users),
          h("div", { className: "admin-stat-card__lbl" }, t.admin_stats_users)
        )
      ),
      h("div", { className: "admin-stat-card" },
        h("div", { className: "admin-stat-card__icon" }, h(Icon, { name: "mapPin", size: 24 })),
        h("div", null,
          h("div", { className: "admin-stat-card__val" }, stats.total_destinations),
          h("div", { className: "admin-stat-card__lbl" }, t.admin_stats_places)
        )
      ),
      h("div", { className: "admin-stat-card" },
        h("div", { className: "admin-stat-card__icon" }, h(Icon, { name: "plus", size: 24 })),
        h("div", null,
          h("div", { className: "admin-stat-card__val" }, stats.pending_proposals),
          h("div", { className: "admin-stat-card__lbl" }, t.admin_stats_pending)
        )
      )
    ),

    h("div", { className: "admin-card" },
      h("h3", { className: "admin-card__title" }, t.admin_pending_proposals),
      proposals.length > 0
        ? h("div", { className: "admin-table-wrap" },
            h("table", { className: "admin-table" },
              h("thead", null,
                h("tr", null,
                  h("th", null, "Lieu"),
                  h("th", null, "Ville"),
                  h("th", null, "Soumis par"),
                  h("th", null, "Actions")
                )
              ),
              h("tbody", null,
                proposals.map(p => h("tr", { key: p.id },
                  h("td", null, p.name),
                  h("td", null, p.city || p.country),
                  h("td", null, p.submitted_by),
                  h("td", null,
                    h("div", { style: { display: "flex", gap: "8px" } },
                      h("button", { className: "action-btn-success", onClick: () => handleApprove(p.id) }, t.approve),
                      h("button", { className: "action-btn-danger", onClick: () => handleReject(p.id) }, t.reject)
                    )
                  )
                ))
              )
            )
          )
        : h("p", { style: { color: "var(--text-secondary)" } }, "Aucune proposition en attente.")
    ),

    h("div", { className: "admin-card" },
      h("h3", { className: "admin-card__title" }, t.admin_add_place),
      h("form", { onSubmit: handleAddPlace, style: { display: "flex", flexDirection: "column", gap: "12px" } },
        h("div", { className: "form-row" },
          h("label", { className: "form-label" },
            h("span", null, "Nom du lieu"),
            h("input", { value: newPlace.name, onChange: e => setNewPlace({ ...newPlace, name: e.target.value }), required: true })
          ),
          h("label", { className: "form-label" },
            h("span", null, "Ville"),
            h("input", { value: newPlace.city, onChange: e => setNewPlace({ ...newPlace, city: e.target.value }), required: true })
          )
        ),
        h("label", { className: "form-label" },
          h("span", null, "Description"),
          h("textarea", { value: newPlace.description, onChange: e => setNewPlace({ ...newPlace, description: e.target.value }), required: true, rows: "2" })
        ),
        h("button", { className: "button-primary", type: "submit" }, "Ajouter au catalogue")
      )
    )
  );
}

// Guided Onboarding Tour Component
function OnboardingTour({ username, onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Bienvenue sur Globetrotter !",
      desc: "Découvrez la plateforme ultime pour explorer les meilleures pépites et merveilles du Cameroun.",
      icon: "compass"
    },
    {
      title: "Explorer le Cameroun",
      desc: "Recherchez parmi des milliers d'attractions, restaurants, parcs et hôtels filtrés par catégorie.",
      icon: "search"
    },
    {
      title: "Vos Favoris & Voyages",
      desc: "Sauvegardez vos coups de cœur d'un simple clic sur le cœur et organisez vos itinéraires.",
      icon: "heart"
    },
    {
      title: "Proposer de nouveaux lieux",
      desc: "Vous connaissez un endroit magnifique ? Proposez-le directement à l'administrateur !",
      icon: "plus"
    }
  ];

  function finish() {
    localStorage.setItem("gt_onboarded_" + username, "true");
    onClose();
  }

  const currentStep = steps[step];

  return h("div", { className: "onboarding-overlay" },
    h("div", { className: "onboarding-card" },
      h("span", { className: "onboarding-card__step" }, `Étape ${step + 1} / ${steps.length}`),
      h("div", { className: "onboarding-card__icon" }, h(Icon, { name: currentStep.icon, size: 32 })),
      h("h2", { className: "onboarding-card__title" }, currentStep.title),
      h("p", { className: "onboarding-card__desc" }, currentStep.desc),
      h("div", { className: "onboarding-card__nav" },
        h("div", { className: "onboarding-dots" },
          steps.map((_, i) => h("div", { key: i, className: i === step ? "onboarding-dot is-active" : "onboarding-dot" }))
        ),
        h("div", { style: { display: "flex", gap: "8px" } },
          step > 0 && h("button", { className: "button-secondary", onClick: () => setStep(step - 1) }, "Précédent"),
          step < steps.length - 1
            ? h("button", { className: "button-primary", onClick: () => setStep(step + 1) }, "Suivant")
            : h("button", { className: "button-primary", onClick: finish }, "C'est parti !")
        )
      )
    )
  );
}

// 5-Minute Login Reminder Toast
function LoginReminder({ onLogin, onClose }) {
  return h("div", { className: "login-reminder-toast" },
    h("div", { className: "login-reminder-toast__icon" }, h(Icon, { name: "user", size: 24 })),
    h("div", { className: "login-reminder-toast__body" },
      h("div", { className: "login-reminder-toast__title" }, "Profitez de l'expérience totale !"),
      h("div", { className: "login-reminder-toast__desc" }, "Connectez-vous pour sauvegarder vos favoris et proposer vos lieux au Cameroun.")
    ),
    h("div", { className: "login-reminder-toast__actions" },
      h("button", { className: "button-primary", onClick: onLogin, style: { fontSize: "12px", padding: "6px 12px" } }, "Se connecter"),
      h("button", { className: "button-secondary", onClick: onClose, style: { fontSize: "12px", padding: "6px 10px" } }, "✕")
    )
  );
}

// Main App Component
function App() {
  const [current, setCurrent] = useState("home");
  const [viewLoading, setViewLoading] = useState(false);
  const [lang, setLang] = useState("fr");
  const [authMode, setAuthMode] = useState("login");
  const [destinations, setDestinations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ q: "", tag: "", max_cost: "" });
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("globetrotterFavorites") || "[]"));
  const [session, setSession] = useState({
    token: localStorage.getItem("globetrotterToken") || "",
    username: localStorage.getItem("globetrotterUser") || "",
  });
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    api("/destinations")
      .then((items) => {
        setDestinations(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // View transition with skeleton effect
  function changeView(newView) {
    if (newView === current) return;
    setViewLoading(true);
    setCurrent(newView);
    setTimeout(() => setViewLoading(false), 200);
  }

  // 5-minute periodic reminder for logged out users
  useEffect(() => {
    if (session.token) {
      setShowReminder(false);
      return;
    }
    const timer = setInterval(() => {
      setShowReminder(true);
    }, 300000); // 5 minutes = 300,000 ms

    return () => clearInterval(timer);
  }, [session.token]);

  // Onboarding trigger on first login
  useEffect(() => {
    if (session.token && session.username) {
      const alreadyOnboarded = localStorage.getItem("gt_onboarded_" + session.username);
      if (!alreadyOnboarded) {
        setShowOnboarding(true);
      }
    }
  }, [session.token, session.username]);

  function toggleFavorite(key) {
    if (!session.token) {
      handleLoginClick();
      return;
    }
    
    setFavorites((prev) => {
      const isFav = prev.includes(key);
      const next = isFav ? prev.filter((item) => item !== key) : [...prev, key];
      localStorage.setItem("globetrotterFavorites", JSON.stringify(next));
      return next;
    });
  }

  function handleLoginClick() {
    setAuthMode("login");
    changeView("profile");
  }

  function handleAuthSuccess() {
    changeView("home");
  }

  const renderScreen = () => {
    if (viewLoading) return h(SkeletonGrid, { count: 6 });

    switch (current) {
      case "explorer":
        return h(Explorer, { destinations, filters, setFilters, favorites, toggleFavorite, openDetail: setSelected, session, onLoginClick: handleLoginClick, loading, lang });
      case "itinerary":
        return h(ItineraryPage, { session, onLoginClick: handleLoginClick, lang });
      case "favorites":
        return h(Favorites, { destinations, favorites, toggleFavorite, openDetail: setSelected, session, onLoginClick: handleLoginClick, loading, lang });
      case "profile":
        return !session.token
          ? h(AuthPage, { mode: authMode, setMode: setAuthMode, setSession, onSuccess: handleAuthSuccess, lang })
          : h(Profile, { session, setSession, favorites, destinations, onLoginClick: handleLoginClick, lang, setLang });
      case "admin":
        return session.username === "admin"
          ? h(AdminDashboard, { session, lang })
          : h(Home, { destinations, favorites, toggleFavorite, openDetail: setSelected, setCurrent: changeView, setFilters, session, onLoginClick: handleLoginClick, loading, lang });
      default:
        return h(Home, { destinations, favorites, toggleFavorite, openDetail: setSelected, setCurrent: changeView, setFilters, session, onLoginClick: handleLoginClick, loading, lang });
    }
  };

  return h(Fragment, null,
    h(TopHeader, { onPropose: () => setShowProposalModal(true), session, lang, setLang, current, setCurrent: changeView }),
    h("main", { className: "app-main" }, renderScreen()),
    h(BottomNav, { current, setCurrent: changeView, session, lang }),
    h(DetailModal, { destination: selected, onClose: () => setSelected(null), lang }),
    showProposalModal && session.token && h(ProposalForm, { session, onClose: () => setShowProposalModal(false), lang }),
    showOnboarding && h(OnboardingTour, { username: session.username, onClose: () => setShowOnboarding(false) }),
    showReminder && !session.token && h(LoginReminder, { onLogin: handleLoginClick, onClose: () => setShowReminder(false) })
  );
}

createRoot(document.getElementById("root")).render(h(App));
