import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import MemoryModal from '../components/MemoryModal'
import WeatherWidget from '../components/WeatherWidget'
import PlaceMap from '../components/PlaceMap'
import { API_URL } from '../config'
import { trackEvent, trackInteraction } from '../api/tracking'

function ExplorerPage() {
  const navigate = useNavigate()
  const [audioActive, setAudioActive] = useState(true)
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(0)
  const [places, setPlaces] = useState([])
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [budgetFilter, setBudgetFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  const [showMemoryPrompt, setShowMemoryPrompt] = useState(false)
  const [existingMemory, setExistingMemory] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    setLoading(true)
    setLoadError('')

    fetch(`${API_URL}/places`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger les destinations.')
        return res.json()
      })
      .then((data) => {
        const placeList = data.places || (Array.isArray(data) ? data : [])
        const mapped = placeList.map((dbPlace) => ({
          id: dbPlace.id,
          title: dbPlace.name.toUpperCase(),
          rawName: dbPlace.name,
          location: dbPlace.address || 'Adresse non renseignée',
          category: dbPlace.category_name || 'Catégorie non renseignée',
          zone: dbPlace.region || 'Région non renseignée',
          budget: dbPlace.price_level === 'expensive' ? '€€€' : dbPlace.price_level === 'budget' ? '€' : '€€',
          priceLevel: dbPlace.price_level || '',
          tags: Array.isArray(dbPlace.tags) ? dbPlace.tags : [],
          access: 'ACCÈS LIBRE',
          heroImage: dbPlace.cover_image || '',
          dropCap: dbPlace.name.charAt(0).toUpperCase(),
          leadText: dbPlace.description || 'Description non renseignée.',
          bodyText: dbPlace.long_description || dbPlace.description || '',
          quote: `« ${dbPlace.name} — Un endroit unique enregistré dans votre base de données Globetrotter. »`,
          quoteAuthor: '— CARNET DE VOYAGE',
          hours: typeof dbPlace.opening_hours === 'string' ? dbPlace.opening_hours : '08:00 - 18:00',
          phone: dbPlace.phone || 'Téléphone non renseigné',
          website: dbPlace.website || 'Site web non renseigné',
          coords: dbPlace.latitude && dbPlace.longitude ? `${dbPlace.latitude}°, ${dbPlace.longitude}°` : 'Coordonnées non renseignées',
          latitude: dbPlace.latitude ? parseFloat(dbPlace.latitude) : null,
          longitude: dbPlace.longitude ? parseFloat(dbPlace.longitude) : null,
          altitude: dbPlace.altitude ? `${dbPlace.altitude} m` : 'Altitude non renseignée',
          bestSeason: dbPlace.best_season || 'Saison non renseignée',
          audioTitle: `Ambiance sonore : ${dbPlace.name}`,
          visitedDate: 'RÉCENT',
        }))
        setPlaces(mapped)
      })
      .catch((err) => {
        console.error('Failed to fetch places:', err)
        setLoadError(err.message || 'Une erreur réseau est survenue. Merci de réessayer.')
      })
      .finally(() => setLoading(false))

    if (token && token !== 'null' && token !== 'undefined') {
      fetch(`${API_URL}/profile/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => res.ok ? res.json() : { favorites: [] })
        .then((data) => setFavoriteIds(new Set((data.favorites || []).map((favorite) => favorite.place_id || favorite.id))))
        .catch(() => setFavoriteIds(new Set()))
    }
  }, [])

  const categories = [...new Set(places.map((item) => item.category).filter(Boolean))]
  const budgets = [...new Set(places.map((item) => item.priceLevel).filter(Boolean))]
  const tags = [...new Set(places.flatMap((item) => item.tags).filter(Boolean))]

  const visiblePlaces = places.filter((item) => {
    const matchesSearch = !searchTerm || `${item.rawName} ${item.leadText} ${item.location}`.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    const matchesBudget = !budgetFilter || item.priceLevel === budgetFilter
    const matchesTag = !tagFilter || item.tags.includes(tagFilter)
    return matchesSearch && matchesCategory && matchesBudget && matchesTag
  })

  // Garde-fou : si la liste filtrée change de taille, on recale l'index sélectionné
  // plutôt que de laisser `place` pointer vers `undefined`.
  const safeIndex = visiblePlaces.length === 0 ? -1 : Math.min(selectedPlaceIndex, visiblePlaces.length - 1)
  const place = safeIndex >= 0 ? visiblePlaces[safeIndex] : null

  const resetFiltersAndIndex = (setter) => (value) => {
    setter(value)
    setSelectedPlaceIndex(0)
  }

  useEffect(() => {
    if (place) {
      trackEvent('place_viewed', { place_id: place.id })
      trackInteraction(place.id, 'view')
    }
  }, [place?.id])

  const handleAddFavorite = async () => {
    if (!place) return
    const token = localStorage.getItem('auth_token')
    try {
      const response = await fetch(`${API_URL}/profile/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ place_id: place.id }),
      })
      if (!response.ok) throw new Error('Impossible de modifier les favoris.')
      setFavoriteIds((current) => new Set(current).add(place.id))
      trackEvent('place_favorited', { place_id: place.id })
      trackInteraction(place.id, 'favorite')
      setActionSuccess(`"${place.rawName}" a été ajouté à vos favoris !`)
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (e) {
      console.error(e)
      setActionSuccess(e.message)
      setTimeout(() => setActionSuccess(''), 3000)
    }
  }

  const handleRemoveFavorite = async () => {
    if (!place) return
    const token = localStorage.getItem('auth_token')
    try {
      const response = await fetch(`${API_URL}/profile/favorites/${place.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Impossible de retirer ce favori.')
      setFavoriteIds((current) => {
        const next = new Set(current)
        next.delete(place.id)
        return next
      })
      setActionSuccess(`"${place.rawName}" a été retiré de vos favoris.`)
      setTimeout(() => setActionSuccess(''), 3000)
    } catch (e) {
      setActionSuccess(e.message)
      setTimeout(() => setActionSuccess(''), 3000)
    }
  }

  const handleMarkVisited = async () => {
    if (!place) return
    const token = localStorage.getItem('auth_token')
    try {
      await fetch(`${API_URL}/profile/visited-places`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ place_id: place.id }),
      })
      setActionSuccess(`"${place.rawName}" marqué comme visité !`)
      trackEvent('place_visited', { place_id: place.id })
      trackInteraction(place.id, 'visit')
      setTimeout(() => setActionSuccess(''), 2000)

      // Vérifie si un souvenir existe déjà pour ce lieu
      const memRes = await fetch(`${API_URL}/memories/place/${place.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (memRes.ok) {
        const memData = await memRes.json()
        setExistingMemory(memData)
      } else {
        setExistingMemory(null)
      }
      setShowMemoryPrompt(true)
    } catch (e) {
      console.error(e)
      setActionSuccess("Impossible de marquer ce lieu comme visité pour le moment.")
      setTimeout(() => setActionSuccess(''), 3000)
    }
  }

  const handleAddToItinerary = () => {
    if (!place) return
    localStorage.setItem('pending_itinerary_place', JSON.stringify({ id: place.id, name: place.rawName }))
    trackInteraction(place.id, 'add_to_itinerary')
    trackEvent('itinerary_activity_requested', { place_id: place.id })
    navigate('/itinerary')
  }

  const filterBarStyle = { flex: '0 1 200px', padding: '10px 14px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.35)', color: '#EBF2FA', borderRadius: '6px' }

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA', paddingBottom: '100px' }}>
      <style>{`
        @keyframes gt-spin { to { transform: rotate(360deg); } }
        @keyframes gt-fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>

      <Navbar audioActive={audioActive} onToggleAudio={() => setAudioActive(!audioActive)} />

      <div className="app-container">
        {/* Barre de recherche et filtres — toujours visible (US-04) */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => resetFiltersAndIndex(setSearchTerm)(e.target.value)}
            placeholder="Rechercher un lieu..."
            aria-label="Rechercher un lieu"
            style={{ flex: '1 1 240px', padding: '10px 14px', background: 'rgba(20,35,29,0.8)', border: '1px solid rgba(212,175,55,0.35)', color: '#EBF2FA', borderRadius: '6px' }}
          />
          <select
            value={categoryFilter}
            onChange={(e) => resetFiltersAndIndex(setCategoryFilter)(e.target.value)}
            aria-label="Filtrer par catégorie"
            style={filterBarStyle}
          >
            <option value="">Toutes les catégories</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select
            value={budgetFilter}
            onChange={(e) => resetFiltersAndIndex(setBudgetFilter)(e.target.value)}
            aria-label="Filtrer par budget"
            style={filterBarStyle}
          >
            <option value="">Tous les budgets</option>
            {budgets.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => resetFiltersAndIndex(setTagFilter)(e.target.value)}
            aria-label="Filtrer par tag"
            style={filterBarStyle}
          >
            <option value="">Tous les tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Indicateur de chargement — US-13 */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '16px', animation: 'gt-fade 0.3s ease-out' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid rgba(212,175,55,0.2)', borderTopColor: '#A4BD01',
              animation: 'gt-spin 0.8s linear infinite',
            }} />
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', letterSpacing: '0.1em' }}>
              CHARGEMENT DES DESTINATIONS...
            </div>
          </div>
        )}

        {/* Erreur réseau — US-12 */}
        {!loading && loadError && (
          <div style={{
            textAlign: 'center', padding: '60px 24px', animation: 'gt-fade 0.3s ease-out',
            fontFamily: "'Work Sans', sans-serif",
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <p style={{ color: '#EBF2FA', fontSize: '16px', marginBottom: '4px' }}>{loadError}</p>
            <p style={{ color: '#427AA1', fontSize: '13px' }}>Vérifiez votre connexion puis rechargez la page.</p>
          </div>
        )}

        {/* Aucun résultat — US-04 */}
        {!loading && !loadError && visiblePlaces.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 24px', animation: 'gt-fade 0.3s ease-out',
            fontFamily: "'Work Sans', sans-serif",
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🧭</div>
            <p style={{ color: '#EBF2FA', fontSize: '17px', marginBottom: '4px' }}>Aucun lieu ne correspond à votre recherche.</p>
            <p style={{ color: '#427AA1', fontSize: '13px', marginBottom: '20px' }}>Essayez d'ajuster votre mot-clé ou vos filtres.</p>
            <button
              onClick={() => { setSearchTerm(''); setCategoryFilter(''); setBudgetFilter(''); setTagFilter(''); setSelectedPlaceIndex(0) }}
              style={{
                background: 'rgba(164, 189, 1, 0.15)', border: '1px solid #A4BD01', color: '#A4BD01',
                padding: '10px 20px', borderRadius: '6px', fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '11px', cursor: 'pointer',
              }}
            >
              RÉINITIALISER LES FILTRES
            </button>
          </div>
        )}

        {/* Contenu principal — affiché uniquement quand `place` est garanti non-null */}
        {!loading && !loadError && place && (
          <>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
              {visiblePlaces.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlaceIndex(idx)}
                  style={{
                    background: safeIndex === idx ? 'rgba(164, 189, 1, 0.2)' : 'rgba(2, 32, 46, 0.6)',
                    border: safeIndex === idx ? '1px solid #A4BD01' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: safeIndex === idx ? '#A4BD01' : '#427AA1',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  📍 {p.title}
                </button>
              ))}
            </div>

            {/* Hero Banner with Overlay Stamp */}
            <div
              style={{
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                height: '380px',
                marginBottom: '32px',
                border: '1px solid rgba(164, 189, 1, 0.25)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
              }}
            >
              <img
                src={place.heroImage}
                alt={place.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(14, 20, 17, 0.4) 0%, rgba(14, 20, 17, 0.95) 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '28px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => navigate('/home')}
                    style={{
                      background: 'rgba(14, 20, 17, 0.8)',
                      border: '1px solid rgba(164, 189, 1, 0.4)',
                      color: '#EBF2FA',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    ← RETOUR
                  </button>

                  <div
                    style={{
                      background: 'rgba(164, 189, 1, 0.2)',
                      border: '1px solid #A4BD01',
                      color: '#A4BD01',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#A4BD01' }} />
                    AMBIANCE ACTIVE
                  </div>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: '30px',
                    right: '40px',
                    width: '110px',
                    height: '110px',
                    border: '2px dashed #A4BD01',
                    borderRadius: '50%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: 'rotate(-12deg)',
                    background: 'rgba(14, 20, 17, 0.6)',
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 0 15px rgba(164, 189, 1, 0.3)',
                  }}
                >
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px', color: '#A4BD01', letterSpacing: '0.1em' }}>
                    VISITÉ
                  </span>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', fontWeight: 'bold', color: '#EBF2FA' }}>
                    {place.visitedDate}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '8px', color: '#427AA1' }}>
                    {place.title.split(',')[0]}
                  </span>
                </div>

                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: '15px', color: '#427AA1' }}>
                  Carnet d'exploration : {place.title}, {place.location}
                </div>
              </div>
            </div>

            {/* Masthead & Main Editorial View */}
            <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#A4BD01', letterSpacing: '0.14em', marginBottom: '8px' }}>
                RUBRIQUE — {place.category}
              </div>
              <div style={{ width: '100%', height: '1px', background: 'rgba(164, 189, 1, 0.3)', marginBottom: '24px' }} />

              <h1
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: '56px',
                  fontWeight: 700,
                  color: '#EBF2FA',
                  letterSpacing: '0.02em',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                }}
              >
                {place.title}
              </h1>

              {place.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                  {place.tags.map((t) => (
                    <span key={t} style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                      color: '#A4BD01', border: '1px solid rgba(212,175,55,0.4)',
                      borderRadius: '20px', padding: '4px 10px',
                    }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginBottom: '32px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: '#427AA1',
                    letterSpacing: '0.08em',
                  }}
                >
                  ZONE : {place.zone} &nbsp;|&nbsp; BUDGET : {place.budget} &nbsp;|&nbsp; ACCÈS : {place.access}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={favoriteIds.has(place.id) ? handleRemoveFavorite : handleAddFavorite}
                    style={{
                      background: 'rgba(164, 189, 1, 0.15)',
                      border: '1px solid #A4BD01',
                      color: '#A4BD01',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                    }}
                  >
                    {favoriteIds.has(place.id) ? '❤️ Retirer des favoris' : '🤍 Ajouter aux favoris'}
                  </button>
                  <button
                    onClick={handleMarkVisited}
                    style={{
                      background: 'rgba(6, 102, 140, 0.4)',
                      border: '1px solid rgba(164, 189, 1, 0.4)',
                      color: '#EBF2FA',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    📍 Marquer visité
                  </button>
                </div>
              </div>

              {actionSuccess && (
                <div
                  style={{
                    background: 'rgba(164, 189, 1, 0.2)',
                    border: '1px solid #A4BD01',
                    color: '#A4BD01',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '12px',
                    marginBottom: '24px',
                    textAlign: 'center',
                    boxShadow: '0 4px 15px rgba(164, 189, 1, 0.2)',
                  }}
                >
                  ✨ {actionSuccess}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '84px',
                    lineHeight: '0.8',
                    color: '#A4BD01',
                    fontWeight: 'bold',
                  }}
                >
                  {place.dropCap}
                </span>
                <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '17px', lineHeight: '1.7', color: '#EBF2FA' }}>
                  {place.leadText}
                </p>
              </div>

              <p style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '16px', lineHeight: '1.8', color: 'rgba(239, 230, 211, 0.85)', marginBottom: '32px' }}>
                {place.bodyText}
              </p>

              <div
                style={{
                  borderLeft: '3px solid #A4BD01',
                  paddingLeft: '24px',
                  margin: '36px 0',
                  background: 'rgba(164, 189, 1, 0.04)',
                  paddingTop: '16px',
                  paddingBottom: '16px',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontSize: '24px',
                    lineHeight: '1.4',
                    color: '#A4BD01',
                    marginBottom: '8px',
                  }}
                >
                  {place.quote}
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1' }}>
                  {place.quoteAuthor}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(2, 32, 46, 0.8)',
                  border: '1px solid rgba(164, 189, 1, 0.25)',
                  borderRadius: '12px',
                  padding: '24px 28px',
                  margin: '40px 0',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '11px',
                    color: '#A4BD01',
                    letterSpacing: '0.12em',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>ℹ️</span> INFOS PRATIQUES
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#427AA1' }}>HORAIRES : </span>
                    <span style={{ color: '#EBF2FA' }}>{place.hours}</span>
                  </div>
                  <div>
                    <span style={{ color: '#427AA1' }}>COORDONNÉES : </span>
                    <span style={{ color: '#EBF2FA' }}>{place.coords}</span>
                  </div>
                  <div>
                    <span style={{ color: '#427AA1' }}>TÉLÉPHONE : </span>
                    <span style={{ color: '#EBF2FA' }}>{place.phone}</span>
                  </div>
                  <div>
                    <span style={{ color: '#427AA1' }}>ALTITUDE : </span>
                    <span style={{ color: '#EBF2FA' }}>{place.altitude}</span>
                  </div>
                  <div>
                    <span style={{ color: '#427AA1' }}>SITE WEB : </span>
                    <span style={{ color: '#A4BD01' }}>{place.website}</span>
                  </div>
                  <div>
                    <span style={{ color: '#427AA1' }}>MEILLEURE SAISON : </span>
                    <span style={{ color: '#EBF2FA' }}>{place.bestSeason}</span>
                  </div>
                </div>
              </div>

              {/* ── Météo du lieu ── */}
              <div style={{ margin: '24px 0' }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  color: '#A4BD01', letterSpacing: '0.12em', marginBottom: 12,
                }}>
                  ☁ MÉTÉO ACTUELLE
                </div>
                <WeatherWidget
                  lat={place.latitude}
                  lon={place.longitude}
                  placeName={place.rawName}
                  size="full"
                />
              </div>

              {/* ── Carte Leaflet ── */}
              <div style={{ margin: '24px 0 48px' }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 11,
                  color: '#A4BD01', letterSpacing: '0.12em', marginBottom: 12,
                }}>
                  📍 LOCALISATION
                </div>
                <PlaceMap
                  lat={place.latitude}
                  lon={place.longitude}
                  name={place.rawName}
                  address={place.location}
                  height="300px"
                />
              </div>

              <button
                onClick={handleAddToItinerary}
                style={{
                  position: 'fixed',
                  right: '48px',
                  bottom: '100px',
                  width: '130px',
                  height: '130px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #A4BD01 0%, #679436 100%)',
                  color: '#02202E',
                  border: '2px solid #EBF2FA',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(164, 189, 1, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '0.06em',
                  zIndex: 800,
                  transition: 'transform 0.2s ease',
                }}
              >
                <span style={{ fontSize: '24px' }}>➕</span>
                <span style={{ textAlign: 'center', lineHeight: '1.2' }}>
                  AJOUTER À<br />MON ITINÉRAIRE
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Memory Prompt — après marquage comme visité */}
      {showMemoryPrompt && place && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1500,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'linear-gradient(160deg, #06668C 0%, #02202E 100%)',
            border: '1px solid rgba(212,175,55,0.4)',
            borderRadius: '20px', padding: '36px 32px', maxWidth: '440px', width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(212,175,55,0.15)',
            animation: 'gt-fade 0.3s ease-out',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏝️</div>
            <div style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
              color: '#A4BD01', letterSpacing: '0.14em', marginBottom: '8px',
            }}>
              {existingMemory ? 'VOUS AVEZ DÉJÀ VISITÉ CE LIEU' : 'TU VIENS DE DÉCOUVRIR'}
            </div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '26px', fontWeight: 600, color: '#EBF2FA', marginBottom: '12px',
            }}>{place.rawName}  !</h3>
            <p style={{
              fontFamily: "'Work Sans', sans-serif", fontSize: '14px',
              color: '#427AA1', lineHeight: 1.6, marginBottom: '28px',
            }}>
              {existingMemory
                ? 'Voulez-vous raconter cette aventure ou mettre à jour votre souvenir ?'
                : 'Garde un souvenir de cette aventure. Chaque lieu devient une page de ton histoire.'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { setShowMemoryPrompt(false); setShowMemoryModal(true) }}
                style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #A4BD01, #679436)',
                  border: 'none', color: '#02202E', borderRadius: '10px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                  fontWeight: 'bold', letterSpacing: '0.1em', cursor: 'pointer',
                }}
              >📖 {existingMemory ? 'MODIFIER MON SOUVENIR' : 'CRÉER MON SOUVENIR'}</button>

              <button
                onClick={() => setShowMemoryPrompt(false)}
                style={{
                  width: '100%', padding: '12px',
                  background: 'transparent', border: '1px solid rgba(156,145,124,0.3)',
                  color: '#427AA1', borderRadius: '10px',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
                  cursor: 'pointer', letterSpacing: '0.06em',
                }}
              >Plus tard</button>
            </div>
          </div>
        </div>
      )}

      {/* Memory Creation/Edit Modal */}
      {showMemoryModal && place && (
        <MemoryModal
          place={place}
          existingMemory={existingMemory}
          onClose={() => setShowMemoryModal(false)}
          onSaved={() => {
            setActionSuccess('Votre souvenir a été enregistré dans Mon Histoire ! 📖')
            setTimeout(() => setActionSuccess(''), 4000)
          }}
        />
      )}
    </div>
  )
}

export default ExplorerPage