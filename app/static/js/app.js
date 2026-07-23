const { createElement: h, Fragment, useEffect, useMemo, useState } = React;
const { createRoot } = ReactDOM;

const ASSET_BASE = "/assets/";
const LOGO = `${ASSET_BASE}logo2.png`;

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
};

const categories = [
  { label: "Nature", tag: "nature", icon: "compass" },
  { label: "Culture", tag: "culture", icon: "map" },
  { label: "Restaurants", tag: "food", icon: "fork" },
  { label: "Activites", tag: "adventure", icon: "activity" },
  { label: "Hotels", tag: "wellness", icon: "hotel" },
];

const editorial = {
  restaurants: [
    { name: "Maison Azur", city: "Lisbonne", image: "g10.jpg", note: "Cuisine atlantique et terrasse douce" },
    { name: "Nami Table", city: "Kyoto", image: "g12.jpg", note: "Menu saisonnier calme et precis" },
    { name: "Atlas Garden", city: "Marrakech", image: "g13.jpg", note: "Diner parfume dans un patio" },
  ],
  activities: [
    { name: "Route panoramique", city: "Cape Town", image: "g6.jpg", note: "Ocean, montagne et lumiere du soir" },
    { name: "Marche sacre", city: "Cusco", image: "g8.jpg", note: "Culture andine et paysages ouverts" },
    { name: "Sources chaudes", city: "Reykjavik", image: "g9.jpg", note: "Pause minerale apres l'exploration" },
  ],
  hotels: [
    { name: "Casa Bruma", city: "Santorini", image: "g14.jpg", note: "Suites claires face a l'horizon" },
    { name: "Riad Celeste", city: "Marrakech", image: "g2.jpg", note: "Cour interieure, silence et artisanat" },
    { name: "Villa Canopy", city: "Bali", image: "g1.jpg", note: "Jardin tropical et reveil lent" },
  ],
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
  }, h("path", { d: icons[name] }));
}

function money(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

async function api(path, options = {}, token = "") {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Une erreur est survenue");
  return payload;
}

function Header({ current, setCurrent }) {
  const nav = [
    ["home", "Accueil"],
    ["explorer", "Explorer"],
    ["favorites", "Favoris"],
    ["profile", "Profil"],
  ];

  return h(Fragment, null,
    h("aside", { className: "sidebar", "aria-label": "Navigation desktop" },
      h("button", { className: "brand brand--button", onClick: () => setCurrent("home"), type: "button" },
        h("img", { src: LOGO, alt: "Logo Globetrotter" }),
        h("span", null, "Globetrotter")
      ),
      h("nav", { className: "sidebar__nav" },
        nav.map(([key, label]) => h("button", {
          key,
          type: "button",
          className: current === key ? "nav-pill is-active" : "nav-pill",
          onClick: () => setCurrent(key),
        }, h(Icon, { name: key === "home" ? "compass" : key === "explorer" ? "map" : key === "favorites" ? "heart" : "user" }), h("span", null, label)))
      )
    ),
    h("header", { className: "topbar" },
      h("button", { className: "brand brand--button", onClick: () => setCurrent("home"), type: "button" },
        h("img", { src: LOGO, alt: "Logo Globetrotter" }),
        h("span", null, "Globetrotter")
      ),
      h("nav", { className: "nav", "aria-label": "Navigation principale" },
        nav.map(([key, label]) => h("button", {
          key,
          type: "button",
          className: current === key ? "is-active" : "",
          onClick: () => setCurrent(key),
        }, label))
      )
    ),
    h("nav", { className: "bottom-nav", "aria-label": "Navigation mobile" },
      nav.map(([key, label]) => h("button", {
        key,
        type: "button",
        className: current === key ? "is-active" : "",
        onClick: () => setCurrent(key),
        "aria-label": label,
      }, h(Icon, { name: key === "home" ? "compass" : key === "explorer" ? "map" : key === "favorites" ? "heart" : "user" }), h("span", null, label)))
    )
  );
}

function Hero({ setCurrent, setFilters }) {
  const [search, setSearch] = useState("");

  function submit(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: search }));
    setCurrent("explorer");
  }

  return h("section", { className: "hero" },
    h("picture", null,
      h("source", { media: "(max-width: 720px)", srcSet: `${ASSET_BASE}g3.jpg` }),
      h("img", { src: `${ASSET_BASE}g11.jpg`, alt: "Destination lumineuse au coucher du soleil" })
    ),
    h("div", { className: "hero__veil" }),
    h("div", { className: "hero__content" },
      h("img", { className: "hero__logo", src: LOGO, alt: "Logo Globetrotter" }),
      h("p", { className: "eyebrow" }, "Discover with intention"),
      h("h1", null, "Globetrotter"),
      h("p", { className: "hero__copy" }, "Un carnet de voyage vivant pour explorer les lieux, restaurants, hotels et experiences qui donnent envie de partir maintenant."),
      h("form", { className: "search-card", onSubmit: submit },
        h(Icon, { name: "search", size: 22 }),
        h("input", {
          value: search,
          onChange: (event) => setSearch(event.target.value),
          placeholder: "Rechercher une ville, une ambiance, un pays...",
          "aria-label": "Recherche de destination",
        }),
        h("button", { className: "button button--primary", type: "submit" }, "Explorer")
      ),
      h("div", { className: "category-row" },
        categories.map((category) => h("button", {
          className: "category-pill",
          key: category.tag,
          type: "button",
          onClick: () => {
            setFilters((current) => ({ ...current, tag: category.tag }));
            setCurrent("explorer");
          },
        }, h(Icon, { name: category.icon, size: 18 }), h("span", null, category.label)))
      )
    )
  );
}

function SectionHeading({ eyebrow, title, copy }) {
  return h("div", { className: "section__heading" },
    h("div", null,
      h("p", { className: "eyebrow" }, eyebrow),
      h("h2", null, title)
    ),
    copy && h("p", { className: "section__copy" }, copy)
  );
}

function DestinationCard({ destination, favorites, toggleFavorite, openDetail, feature = false }) {
  const isFavorite = favorites.includes(destination.name);
  return h("article", { className: feature ? "destination-card destination-card--feature" : "destination-card" },
    h("button", { className: isFavorite ? "favorite-button is-active" : "favorite-button", type: "button", onClick: () => toggleFavorite(destination.name), "aria-label": "Ajouter aux favoris" }, h(Icon, { name: "heart", size: 19 })),
    h("img", { src: `${ASSET_BASE}${destination.image}`, alt: destination.name, loading: "lazy" }),
    h("div", { className: "destination-card__body" },
      h("div", { className: "meta" },
        h("span", null, destination.country),
        h("span", null, `${money(destination.avg_cost_per_day)}/jour`)
      ),
      h("h3", null, destination.name),
      h("p", null, destination.description),
      h("div", { className: "chips" }, (destination.tags || []).slice(0, 4).map((tag) => h("span", { className: "chip", key: tag }, tag))),
      h("button", { className: "button button--secondary", type: "button", onClick: () => openDetail(destination) }, "Voir le detail")
    )
  );
}

function EditorialStrip({ title, items, icon }) {
  return h("section", { className: "section section--compact" },
    h(SectionHeading, { eyebrow: "Selection", title, copy: "Des propositions visuelles pour construire un voyage plus riche qu'une simple reservation." }),
    h("div", { className: "editorial-grid" },
      items.map((item) => h("article", { className: "editorial-card", key: item.name },
        h("img", { src: `${ASSET_BASE}${item.image}`, alt: item.name, loading: "lazy" }),
        h("div", null,
          h("span", { className: "round-icon" }, h(Icon, { name: icon, size: 18 })),
          h("h3", null, item.name),
          h("p", null, `${item.city} - ${item.note}`)
        )
      ))
    )
  );
}

function Home({ destinations, favorites, toggleFavorite, openDetail, setCurrent, setFilters }) {
  const popular = destinations.slice(0, 4);
  const closeBy = destinations.slice(4, 8);

  return h(Fragment, null,
    h(Hero, { setCurrent, setFilters }),
    h("section", { className: "section" },
      h(SectionHeading, { eyebrow: "Populaire", title: "Destinations qui donnent le ton", copy: "Des cartes immersives, de l'espace, et des choix rapides pour passer de l'inspiration a l'itineraire." }),
      h("div", { className: "destination-grid destination-grid--featured" },
        popular.map((destination, index) => h(DestinationCard, {
          destination,
          favorites,
          toggleFavorite,
          openDetail,
          feature: index === 0,
          key: destination.name,
        }))
      )
    ),
    h(EditorialStrip, { title: "Restaurants a decouvrir", items: editorial.restaurants, icon: "fork" }),
    h(EditorialStrip, { title: "Activites signature", items: editorial.activities, icon: "activity" }),
    h("section", { className: "section" },
      h(SectionHeading, { eyebrow: "Autour de vous", title: "Destinations proches de vos envies", copy: "Une selection calme, lisible et orientee exploration." }),
      h("div", { className: "nearby-grid" },
        closeBy.map((destination) => h("button", { className: "nearby-card", key: destination.name, type: "button", onClick: () => openDetail(destination) },
          h("img", { src: `${ASSET_BASE}${destination.image}`, alt: "" }),
          h("span", null, destination.name),
          h("small", null, destination.continent)
        ))
      )
    )
  );
}

function Explorer({ destinations, filters, setFilters, favorites, toggleFavorite, openDetail }) {
  const filtered = useMemo(() => destinations.filter((destination) => {
    const q = filters.q.trim().toLowerCase();
    const tag = filters.tag;
    const budget = Number(filters.max_cost || 0);
    const text = `${destination.name} ${destination.country} ${destination.continent} ${destination.description}`.toLowerCase();
    if (q && !text.includes(q)) return false;
    if (tag && !(destination.tags || []).includes(tag)) return false;
    if (budget && destination.avg_cost_per_day > budget) return false;
    return true;
  }), [destinations, filters]);

  function update(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return h("section", { className: "section explorer-page" },
    h(SectionHeading, { eyebrow: "Explorer", title: "Carte, filtres et inspirations", copy: "Affinez par distance, budget ou intention, puis ouvrez une destination pour construire le voyage." }),
    h("div", { className: "explorer-layout" },
      h("div", { className: "map-panel", "aria-label": "Carte visuelle" },
        h("img", { src: `${ASSET_BASE}g10.jpg`, alt: "Carte visuelle de voyage" }),
        h("div", { className: "map-pin map-pin--one" }, "Bali"),
        h("div", { className: "map-pin map-pin--two" }, "Kyoto"),
        h("div", { className: "map-pin map-pin--three" }, "Lisbonne")
      ),
      h("div", { className: "filter-panel" },
        h("div", { className: "filters filters--premium" },
          h("label", null, h("span", null, "Recherche"), h("input", { name: "q", value: filters.q, onChange: update, placeholder: "Ocean, culture, Paris..." })),
          h("label", null, h("span", null, "Style"), h("select", { name: "tag", value: filters.tag, onChange: update },
            h("option", { value: "" }, "Tous"),
            categories.map((category) => h("option", { value: category.tag, key: category.tag }, category.label))
          )),
          h("label", null, h("span", null, "Budget"), h("input", { name: "max_cost", type: "number", min: "20", step: "10", value: filters.max_cost, onChange: update, placeholder: "150" }))
        ),
        h("div", { className: "capsule-row" }, categories.map((category) => h("button", {
          key: category.tag,
          type: "button",
          className: filters.tag === category.tag ? "capsule is-active" : "capsule",
          onClick: () => setFilters((current) => ({ ...current, tag: current.tag === category.tag ? "" : category.tag })),
        }, h(Icon, { name: category.icon, size: 17 }), category.label))),
        h("div", { className: "destination-grid destination-grid--list" },
          filtered.length ? filtered.map((destination) => h(DestinationCard, { destination, favorites, toggleFavorite, openDetail, key: destination.name })) : h(EmptyState, { title: "Aucune destination trouvee", copy: "Essayez un autre mot-cle ou un budget plus large." })
        )
      )
    )
  );
}

function AuthPanel({ token, setSession, onAuthChange }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", preferences: "" });
  const [notice, setNotice] = useState(token ? "Session active." : "Connectez-vous pour activer vos voyages.");

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const username = form.username.trim();
    const password = form.password;
    const preferences = form.preferences.split(",").map((item) => item.trim()).filter(Boolean);

    try {
      if (mode === "register") {
        await api("/register", { method: "POST", body: JSON.stringify({ username, password, preferences }) });
        setMode("login");
        setNotice("Compte cree. Connectez-vous pour continuer.");
        return;
      }

      const payload = await api("/login", { method: "POST", body: JSON.stringify({ username, password }) });
      localStorage.setItem("globetrotterToken", payload.token);
      localStorage.setItem("globetrotterUser", username);
      setSession({ token: payload.token, username });
      setNotice(`Connecte en tant que ${username}.`);
      onAuthChange();
    } catch (error) {
      setNotice(error.message);
    }
  }

  return h("div", { className: "auth-scene" },
    h("img", { className: "auth-scene__image", src: `${ASSET_BASE}g4.jpg`, alt: "Voyage culturel en lumiere douce" }),
    h("form", { className: "auth-card", onSubmit: submit },
      h("img", { className: "auth-card__logo", src: LOGO, alt: "Logo Globetrotter" }),
      h("p", { className: "eyebrow" }, "Compte voyageur"),
      h("h2", null, mode === "login" ? "Retrouver mon carnet" : "Creer mon espace"),
      h("div", { className: "tabs", role: "tablist", "aria-label": "Connexion ou inscription" },
        ["login", "register"].map((tab) => h("button", {
          className: mode === tab ? "tab is-active" : "tab",
          type: "button",
          key: tab,
          onClick: () => setMode(tab),
        }, tab === "login" ? "Connexion" : "Inscription"))
      ),
      h("label", null, h("span", null, "Nom d'utilisateur"), h("input", { name: "username", autoComplete: "username", value: form.username, onChange: update, required: true })),
      h("label", null, h("span", null, "Mot de passe"), h("input", { name: "password", type: "password", autoComplete: "current-password", value: form.password, onChange: update, required: true })),
      mode === "register" && h("label", null, h("span", null, "Preferences"), h("input", { name: "preferences", value: form.preferences, onChange: update, placeholder: "nature, food, culture" })),
      h("button", { className: "button button--primary", type: "submit" }, "Continuer"),
      h("p", { className: "notice", role: "status" }, notice)
    )
  );
}

function Recommendations({ token, refreshKey }) {
  const [items, setItems] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!token) {
      setItems([]);
      setNotice("Connectez-vous pour recevoir des recommandations personnalisees.");
      return;
    }
    let cancelled = false;
    api("/recommendations?limit=4", {}, token)
      .then((items) => {
        if (!cancelled) {
          setItems(items);
          setNotice("");
        }
      })
      .catch((error) => !cancelled && setNotice(error.message));
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  return h("div", { className: "compact-list" },
    notice ? h(EmptyState, { title: "Recommandations en attente", copy: notice }) : items.map((destination) =>
      h("article", { className: "compact-item", key: destination.name },
        h("img", { src: `${ASSET_BASE}${destination.image}`, alt: "" }),
        h("div", null,
          h("h3", null, `${destination.name}, ${destination.country}`),
          h("p", null, destination.description),
          h("span", { className: "soft-stat" }, `Score ${Number(destination.match_score || 0)}`)
        )
      )
    )
  );
}

function ItineraryPlanner({ token, refreshKey, triggerRefresh }) {
  const [trips, setTrips] = useState([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", destinations: "", start_date: "", end_date: "", notes: "" });

  useEffect(() => {
    if (!token) {
      setTrips([]);
      setNotice("Vos itineraires apparaitront ici apres connexion.");
      return;
    }
    let cancelled = false;
    api("/itineraries", {}, token)
      .then((items) => {
        if (!cancelled) {
          setTrips(items);
          setNotice(items.length ? "" : "Aucun itineraire pour le moment.");
        }
      })
      .catch((error) => !cancelled && setNotice(error.message));
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!token) {
      setNotice("Connectez-vous avant de creer un itineraire.");
      return;
    }
    try {
      await api("/itineraries", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          destinations: form.destinations.split(",").map((item) => item.trim()).filter(Boolean),
          start_date: form.start_date,
          end_date: form.end_date,
          notes: form.notes.trim(),
        }),
      }, token);
      setForm({ title: "", destinations: "", start_date: "", end_date: "", notes: "" });
      triggerRefresh();
    } catch (error) {
      setNotice(error.message);
    }
  }

  return h("div", { className: "panel panel--wide" },
    h("div", { className: "panel__title" },
      h("div", null, h("p", { className: "eyebrow" }, "Carnet de route"), h("h2", null, "Composer un voyage")),
      h("span", { className: "round-icon" }, h(Icon, { name: "route" }))
    ),
    h("form", { className: "planner-form", onSubmit: submit },
      h("label", null, h("span", null, "Titre"), h("input", { name: "title", placeholder: "Echappee mediterraneenne", required: true, value: form.title, onChange: update })),
      h("label", null, h("span", null, "Destinations"), h("input", { name: "destinations", placeholder: "Santorini, Rome, Marrakech", value: form.destinations, onChange: update })),
      h("label", null, h("span", null, "Depart"), h("input", { name: "start_date", type: "date", value: form.start_date, onChange: update })),
      h("label", null, h("span", null, "Retour"), h("input", { name: "end_date", type: "date", value: form.end_date, onChange: update })),
      h("label", { className: "planner-form__notes" }, h("span", null, "Notes"), h("textarea", { name: "notes", rows: "3", placeholder: "Ambiance, contraintes, envies particulieres...", value: form.notes, onChange: update })),
      h("button", { className: "button button--primary", type: "submit" }, "Ajouter")
    ),
    h("div", { className: "itinerary-list" },
      notice ? h(EmptyState, { title: "Itineraires", copy: notice }) : trips.map((trip) =>
        h("article", { className: "trip", key: trip.id },
          h("span", { className: "round-icon" }, h(Icon, { name: "calendar", size: 18 })),
          h("div", null,
            h("h3", null, trip.title),
            h("p", null, (trip.destinations || []).join(", ") || "Destination a preciser"),
            h("small", null, [trip.start_date, trip.end_date].filter(Boolean).join(" - ") || "Dates flexibles")
          )
        )
      )
    )
  );
}

function Profile({ session, setSession, favorites, destinations }) {
  const favoriteItems = destinations.filter((destination) => favorites.includes(destination.name));

  function logout() {
    localStorage.removeItem("globetrotterToken");
    localStorage.removeItem("globetrotterUser");
    setSession({ token: "", username: "" });
  }

  return h("section", { className: "section profile-page" },
    h("div", { className: "profile-hero" },
      h("img", { src: `${ASSET_BASE}g5.jpg`, alt: "Ville lumineuse" }),
      h("div", { className: "profile-card" },
        h("img", { src: LOGO, alt: "Logo Globetrotter" }),
        h("p", { className: "eyebrow" }, "Profil"),
        h("h1", null, session.username || "Voyageur"),
        h("div", { className: "stats" },
          h("div", null, h("strong", null, favoriteItems.length), h("span", null, "favoris")),
          h("div", null, h("strong", null, "7"), h("span", null, "badges")),
          h("div", null, h("strong", null, "Sage"), h("span", null, "style"))
        ),
        h("button", { className: "button button--secondary", type: "button", onClick: logout }, session.token ? "Se deconnecter" : "Mode invite")
      )
    ),
    h("div", { className: "preference-grid" },
      ["Nature", "Culture", "Gastronomie", "Hotels calmes", "Activites", "Architecture"].map((item) => h("span", { className: "chip chip--large", key: item }, item))
    )
  );
}

function Favorites({ destinations, favorites, toggleFavorite, openDetail }) {
  const items = destinations.filter((destination) => favorites.includes(destination.name));
  return h("section", { className: "section" },
    h(SectionHeading, { eyebrow: "Favoris", title: "Votre collection d'envies", copy: "Les lieux gardes de cote deviennent la base de vos prochains itineraires." }),
    items.length
      ? h("div", { className: "destination-grid" }, items.map((destination) => h(DestinationCard, { destination, favorites, toggleFavorite, openDetail, key: destination.name })))
      : h(EmptyState, { title: "Aucun favori pour le moment", copy: "Ajoutez des destinations depuis l'accueil ou l'explorer." })
  );
}

function Workspace({ session, setSession }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey((key) => key + 1);
  return h("section", { className: "workspace" },
    h(AuthPanel, { token: session.token, setSession, onAuthChange: triggerRefresh }),
    h("div", { className: "panel" },
      h("div", { className: "panel__title" },
        h("div", null, h("p", { className: "eyebrow" }, "Sur mesure"), h("h2", null, "Recommandations")),
        h("button", { className: "icon-button", type: "button", "aria-label": "Actualiser les recommandations", onClick: triggerRefresh }, h(Icon, { name: "refresh" }))
      ),
      h(Recommendations, { token: session.token, refreshKey })
    ),
    h(ItineraryPlanner, { token: session.token, refreshKey, triggerRefresh })
  );
}

function DetailModal({ destination, onClose, toggleFavorite, isFavorite }) {
  if (!destination) return null;
  return h("div", { className: "modal-backdrop", role: "dialog", "aria-modal": "true", "aria-label": `Detail ${destination.name}` },
    h("article", { className: "detail-modal" },
      h("button", { className: "icon-button detail-modal__close", type: "button", onClick: onClose, "aria-label": "Fermer" }, h(Icon, { name: "close" })),
      h("img", { className: "detail-modal__hero", src: `${ASSET_BASE}${destination.image}`, alt: destination.name }),
      h("div", { className: "detail-modal__content" },
        h("p", { className: "eyebrow" }, destination.continent),
        h("h1", null, destination.name),
        h("div", { className: "rating-row" },
          h(Icon, { name: "star", size: 18 }),
          h("strong", null, "4.8"),
          h("span", null, "Avis voyageurs"),
          h("span", null, `${money(destination.avg_cost_per_day)}/jour`)
        ),
        h("p", null, destination.description),
        h("div", { className: "gallery-row" }, ["g12.jpg", "g13.jpg", "g14.jpg"].map((image) => h("img", { key: image, src: `${ASSET_BASE}${image}`, alt: "Galerie voyage" }))),
        h("div", { className: "detail-grid" },
          h("div", null, h("h3", null, "Restaurants proches"), h("p", null, editorial.restaurants[0].name)),
          h("div", null, h("h3", null, "Hotels"), h("p", null, editorial.hotels[0].name)),
          h("div", null, h("h3", null, "Activites"), h("p", null, editorial.activities[0].name))
        ),
        h("button", { className: "button button--primary detail-modal__cta", type: "button", onClick: () => toggleFavorite(destination.name) }, isFavorite ? "Retirer des favoris" : "Enregistrer ce lieu")
      )
    )
  );
}

function EmptyState({ title, copy }) {
  return h("div", { className: "empty-state" },
    h("img", { src: LOGO, alt: "" }),
    h("h3", null, title),
    h("p", null, copy)
  );
}

function App() {
  const [current, setCurrent] = useState("home");
  const [destinations, setDestinations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ q: "", tag: "", max_cost: "" });
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem("globetrotterFavorites") || "[]"));
  const [session, setSession] = useState({
    token: localStorage.getItem("globetrotterToken") || "",
    username: localStorage.getItem("globetrotterUser") || "",
  });

  useEffect(() => {
    let cancelled = false;
    api("/destinations").then((items) => !cancelled && setDestinations(items));
    return () => { cancelled = true; };
  }, []);

  function toggleFavorite(name) {
    setFavorites((current) => {
      const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
      localStorage.setItem("globetrotterFavorites", JSON.stringify(next));
      return next;
    });
  }

  const screen = current === "explorer"
    ? h(Explorer, { destinations, filters, setFilters, favorites, toggleFavorite, openDetail: setSelected })
    : current === "favorites"
      ? h(Favorites, { destinations, favorites, toggleFavorite, openDetail: setSelected })
      : current === "profile"
        ? h(Profile, { session, setSession, favorites, destinations })
        : h(Home, { destinations, favorites, toggleFavorite, openDetail: setSelected, setCurrent, setFilters });

  return h(Fragment, null,
    h(Header, { current, setCurrent }),
    h("main", { className: "app-shell" },
      screen,
      h(EditorialStrip, { title: "Hotels paisibles", items: editorial.hotels, icon: "hotel" }),
      h(Workspace, { session, setSession })
    ),
    h("footer", { className: "footer" },
      h("img", { src: LOGO, alt: "Logo Globetrotter" }),
      h("span", null, "Globetrotter - produit React premium sur API Flask")
    ),
    h(DetailModal, {
      destination: selected,
      onClose: () => setSelected(null),
      toggleFavorite,
      isFavorite: selected ? favorites.includes(selected.name) : false,
    })
  );
}

createRoot(document.getElementById("root")).render(h(App));
