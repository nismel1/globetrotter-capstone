import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthContext } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { API_URL } from '../config'

function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout } = useContext(AuthContext)
  const navigate = useNavigate()

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showItineraries, setShowItineraries] = useState(false)
  const [profile, setProfile] = useState(null)
  const [visitedPlaces, setVisitedPlaces] = useState([])
  const [favorites, setFavorites] = useState([])
  const [itineraries, setItineraries] = useState([])
  const [achievements, setAchievements] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    const headers = { Authorization: `Bearer ${token}` }
    const savedDefis = localStorage.getItem('globetrotter_defis')
    let localAchievements = []
    if (savedDefis) {
      try {
        const parsed = JSON.parse(savedDefis)
        localAchievements = parsed.filter(m => m.completed).map(m => ({
          name: m.title,
          icon: m.badge.split(' ')[0] || '🏆',
          xp: m.xp,
        }))
      } catch (e) {}
    }

    Promise.all([
      fetch(`${API_URL}/profile`, { headers }).then(res => res.ok ? res.json() : null),
      fetch(`${API_URL}/profile/visited-places`, { headers }).then(res => res.ok ? res.json() : { visited_places: [] }),
      fetch(`${API_URL}/profile/favorites`, { headers }).then(res => res.ok ? res.json() : { favorites: [] }),
      fetch(`${API_URL}/users/me/itineraries`, { headers }).then(res => res.ok ? res.json() : []),
      fetch(`${API_URL}/profile/achievements`, { headers }).then(res => res.ok ? res.json() : []),
    ]).then(([profileData, visitedData, favoritesData, itinerariesData, achievementsData]) => {
      setProfile(profileData)
      setVisitedPlaces(visitedData.visited_places || [])
      setFavorites(favoritesData.favorites || [])
      setItineraries(Array.isArray(itinerariesData) ? itinerariesData : [])
      const mergedAch = (Array.isArray(achievementsData) && achievementsData.length > 0)
        ? achievementsData
        : localAchievements
      setAchievements(mergedAch)
    }).catch(error => {
      setAchievements(localAchievements)
    })
  }, [])

  const stamps = visitedPlaces.slice(0, 7).map((place, index) => ({
    title: (place.name || 'DESTINATION').toUpperCase(),
    country: (place.address || '').split(',').pop()?.trim().toUpperCase() || 'GABON',
    date: place.visited_at ? new Date(place.visited_at).toLocaleDateString('fr-FR') : '',
    x: `${10 + (index % 4) * 22}%`, y: `${10 + Math.floor(index / 4) * 55}%`, rot: `${index % 2 ? 8 : -8}deg`,
  }))

  const memberSince = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR') : '—'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#02202E', color: '#EBF2FA' }}>
      <Navbar audioActive={soundEnabled} onToggleAudio={() => setSoundEnabled(!soundEnabled)} />

      <div className="app-container" style={{ maxWidth: '1000px' }}>
        {/* Passport Banner Card (Wireframe 3) */}
        <div
          style={{
            position: 'relative',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(2, 32, 46, 0.95) 0%, rgba(14, 20, 17, 0.98) 100%)',
            border: '1px solid rgba(164, 189, 1, 0.3)',
            padding: '60px 40px 40px',
            textAlign: 'center',
            marginBottom: '32px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Vintage Passport Stamps Overlay */}
          {stamps.map((s, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                left: s.x,
                top: s.y,
                transform: `rotate(${s.rot})`,
                border: '1px dashed rgba(164, 189, 1, 0.3)',
                borderRadius: '50%',
                width: '76px',
                height: '76px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                opacity: 0.4,
              }}
            >
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '7px', color: '#A4BD01' }}>{s.title}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '6px', color: '#427AA1' }}>{s.country}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '6px', color: '#A4BD01' }}>{s.date}</span>
            </div>
          ))}

          {/* User Avatar */}
          <div
            style={{
              position: 'relative',
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              margin: '0 auto 20px',
              border: '2px solid #A4BD01',
              boxShadow: '0 0 25px rgba(164, 189, 1, 0.3)',
              overflow: 'hidden',
              background: 'var(--forest)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '40px', fontWeight: 'bold', color: '#A4BD01' }}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>

          {/* User Name & Details */}
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '38px', fontWeight: 600, color: '#EBF2FA', marginBottom: '4px' }}>
            {profile?.name || user?.name || '—'}
          </h1>

          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#427AA1', letterSpacing: '0.1em' }}>
            MEMBRE DEPUIS : {memberSince}
          </div>
        </div>

        {/* Passport Sections Cards (Wireframe 3) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Section 0: Mon Histoire */}
          <div
            onClick={() => navigate('/my-history')}
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(20,35,29,0.9) 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              borderRadius: '14px', padding: '20px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#A4BD01'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '28px' }}>📖</span>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#EBF2FA' }}>
                  Mon Histoire
                </h3>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', letterSpacing: '0.08em' }}>
                  CARNET DE VOYAGE PERSONNEL
                </div>
              </div>
            </div>
            <span style={{ fontSize: '20px', color: '#A4BD01' }}>→</span>
          </div>

          {/* Section 1: Mon passeport & Score XP */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.8)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '14px',
              padding: '20px 28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '24px' }}>🛂</span>
              <div>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#EBF2FA' }}>
                  Mon passeport
                </h3>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#A4BD01', letterSpacing: '0.08em' }}>
                  SCORE D'EXPLORATION : {achievements.length} XP
                </div>
              </div>
            </div>

            {/* Badges from the authenticated account */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {achievements.slice(0, 4).map((b, idx) => (
                  <div
                    key={idx}
                    title={b.name}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(164, 189, 1, 0.15)',
                      border: '1px solid #A4BD01',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      cursor: 'pointer',
                    }}
                  >
                    {b.icon || '✦'}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '18px', color: '#427AA1' }}>›</span>
            </div>
          </div>

          {/* Section 2: Mes favoris (24) */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.8)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '14px',
              padding: '20px 28px',
              cursor: 'pointer',
            }}
            onClick={() => setShowFavorites(!showFavorites)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '24px', color: '#A4BD01' }}>❤️</span>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#EBF2FA' }}>
                  Mes favoris
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '16px', fontWeight: 'bold', color: '#A4BD01' }}>
                  {favorites.length}
                </span>
                <span style={{ fontSize: '18px', color: '#427AA1' }}>{showFavorites ? '⌄' : '›'}</span>
              </div>
            </div>

            {showFavorites && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {favorites.length === 0 && <div style={{ color: '#427AA1' }}>Aucun favori enregistré.</div>}
                {favorites.map((fav) => (
                  <div key={fav.place_id} style={{ padding: '6px 0', fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#EBF2FA' }}>
                    📍 {fav.name || 'Lieu supprimé'}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Mes itinéraires (8) */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.8)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '14px',
              padding: '20px 28px',
              cursor: 'pointer',
            }}
            onClick={() => setShowItineraries(!showItineraries)}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '24px' }}>🗺️</span>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#EBF2FA' }}>
                  Mes itinéraires
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '16px', fontWeight: 'bold', color: '#A4BD01' }}>
                  {itineraries.length}
                </span>
                <span style={{ fontSize: '18px', color: '#427AA1' }}>{showItineraries ? '⌄' : '›'}</span>
              </div>
            </div>

            {showItineraries && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {itineraries.length === 0 && <div style={{ color: '#427AA1' }}>Aucun itinéraire enregistré.</div>}
                {itineraries.map((itin) => (
                  <div
                    key={itin.id}
                    onClick={(e) => { e.stopPropagation(); navigate('/itinerary'); }}
                    style={{ padding: '8px 0', fontFamily: "'Work Sans', sans-serif", fontSize: '14px', color: '#A4BD01', cursor: 'pointer' }}
                  >
                    🗺️ {itin.title || 'Itinéraire sans titre'} →
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Paramètres */}
          <div
            style={{
              background: 'rgba(2, 32, 46, 0.8)',
              border: '1px solid rgba(164, 189, 1, 0.25)',
              borderRadius: '14px',
              padding: '24px 28px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <span style={{ fontSize: '20px' }}>⚙️</span>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#EBF2FA' }}>
                Paramètres
              </h3>
            </div>

            {/* Ambiance sonore toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🎵</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: '#EBF2FA' }}>
                  Ambiance sonore
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={() => setSoundEnabled(!soundEnabled)}
                style={{ accentColor: '#A4BD01', transform: 'scale(1.3)', cursor: 'pointer' }}
              />
            </div>

            {/* Langue - Fonctionnel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🌐</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: '#EBF2FA' }}>
                  {t('profile.language')}
                </span>
              </div>
              <LanguageSwitcher />
            </div>

          </div>

          {/* Section 5: Se déconnecter */}
          <div
            onClick={handleLogout}
            style={{
              background: 'rgba(103, 148, 54, 0.15)',
              border: '1px solid #679436',
              borderRadius: '14px',
              padding: '16px 28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            <span style={{ fontSize: '18px', color: '#679436' }}>🚪</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 'bold', color: '#679436' }}>
              Se déconnecter
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
